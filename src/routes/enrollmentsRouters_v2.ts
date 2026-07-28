import { Router, type Request, type Response } from "express";
import {
  zCourseId,
  zCoursePostBody,
  zCoursePutBody,
} from "../libs/zodValidators.ts";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import type { Student, Course, Enrollment, UserPayload } from "../libs/types.ts";

// เปลี่ยนมาดึงข้อมูลผ่านวัตถุ DB ตัวเดียว เพื่อป้องกัน Reference หลุดเวลาเกิดการ Reset ฐานข้อมูล
import { DB } from "../db/db.ts";

const router = Router();
const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";

// GET / - ดึงข้อมูล enrollments ตามสิทธิ์
router.get("/", (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "จำเป็นต้องระบุ Authorization header พร้อมกับ Bearer token",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "จำเป็นต้องระบุ Token",
    });
  }

  try {
    const payload = jwt.verify(token, jwt_secret) as UserPayload;
    const user = DB.users.find((u) => u.username === payload.username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้งานในระบบ",
      });
    }

    if (user.role === "ADMIN") {
      return res.json({
        ok: true,
        enrollments: DB.enrollments,
      });
    } else {
      const userEnrollments = DB.enrollments.filter((e) => e.studentId === user.studentId);
      return res.json({
        ok: true,
        enrollments: userEnrollments, 
      });
    }
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token ไม่ถูกต้องหรือหมดอายุแล้ว",
      error: err,
    });
  }
});

// POST /login - เข้าสู่ระบบ
router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  const user = DB.users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    });
  }
  
  const token = jwt.sign(
    {
      username: user.username,
      studentId: user.studentId,
      role: user.role,
    },
    jwt_secret,
    { expiresIn: "30m" }
  );

  return res.status(200).json({
    success: true,
    message: "เข้าสู่ระบบสำเร็จ",
    token: token,
  });
});

// POST / - เพิ่มข้อมูลการลงทะเบียนเรียน (ห้าม ADMIN เข้าใช้งาน)
router.post("/", (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "จำเป็นต้องระบุ Authorization header พร้อมกับ Bearer token",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "จำเป็นต้องระบุ Token",
    });
  }

  try {
    const payload = jwt.verify(token, jwt_secret) as UserPayload;
    const user = DB.users.find((u) => u.username === payload.username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้งานในระบบ",
      });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({ 
        success: false,
        message: "Only Student can access this API route", 
      });
    }

    // 1. validate courseId ด้วย zod
    const parseResult = zCourseId.safeParse(req.body.courseId);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "courseId ไม่ถูกต้อง",
        errors: parseResult.error.issues,
      });
    }
    const courseId = parseResult.data;

    // 2. ตรวจสอบว่ามีวิชานี้เปิดสอนอยู่จริง
    const courseExists = DB.courses.some((c) => c.courseId === courseId);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบรายวิชาที่ต้องการลงทะเบียนในระบบ",
      });
    }

    const studentId = payload.studentId;

    // 3. ตรวจสอบว่าเคยลงทะเบียนวิชานี้ไปแล้วหรือยัง
    const isAlreadyEnrolled = DB.enrollments.some(
      (enroll) => enroll.studentId === studentId && enroll.courseId === courseId
    );
    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: "คุณได้ลงทะเบียนวิชานี้ไปแล้ว",
      });
    }

    // 4. บันทึกเข้า DB.enrollments
    const newEnrollment: Enrollment = {
      studentId: studentId!,
      courseId: courseId,
    };
    DB.enrollments.push(newEnrollment);

    // 5. บันทึกวิชาเพิ่มเติมเข้าในประวัติตัวแปรของนักศึกษา (DB.students) เพื่อให้ข้อมูลอัปเดตตรงกันทั้งระบบ
    const studentData = DB.students.find((s) => s.studentId === studentId);
    if (studentData) {
      if (!studentData.courses) {
        studentData.courses = [];
      }
      if (!studentData.courses.includes(courseId)) {
        studentData.courses.push(courseId);
      }
    }

    return res.status(201).json({
      success: true,
      message: "ลงทะเบียนเรียนสำเร็จ",
    });

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token ไม่ถูกต้องหรือหมดอายุแล้ว",
      error: err,
    });
  }
});

// DELETE / - ลบข้อมูลการลงทะเบียนเรียน (ห้าม ADMIN เข้าใช้งาน)
router.delete("/", (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "จำเป็นต้องระบุ Authorization header พร้อมกับ Bearer token",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "จำเป็นต้องระบุ Token",
    });
  }

  try {
    const payload = jwt.verify(token, jwt_secret) as UserPayload;
    const user = DB.users.find((u) => u.username === payload.username);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้งานในระบบ",
      });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only Student can access this API route",
      });
    }

    // validate courseId จาก body ด้วย zod
    const parseResult = zCourseId.safeParse(req.body.courseId);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "courseId ไม่ถูกต้อง",
        errors: parseResult.error.issues,
      });
    }
    const courseId = parseResult.data;

    const studentId = payload.studentId;

    // 1. ค้นหาและลบออกจาก DB.enrollments
    const index = DB.enrollments.findIndex(
      (enroll) =>
        enroll.studentId === studentId &&
        enroll.courseId === courseId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    DB.enrollments.splice(index, 1);

    // 2. ค้นหาและเคลียร์ออกจากฟิลด์ courses ภายในข้อมูลนักศึกษา (DB.students) เพื่อให้ข้อมูลหายไปอย่างแท้จริง
    const studentData = DB.students.find((s) => s.studentId === studentId);
    if (studentData && studentData.courses) {
      studentData.courses = studentData.courses.filter((id) => id !== courseId);
    }

    return res.status(200).json({
      ok: true,
      message: "You has dropped from this course. See you next semestar.",
    });
  } catch (err) {
    console.log(err);
    return res.status(401).json({
      success: false,
      message: "Token ไม่ถูกต้องหรือหมดอายุแล้ว",
      error: err,
    });
  }
});

export default router;