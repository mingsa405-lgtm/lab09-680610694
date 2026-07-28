import {
  type Student,
  type Course,
  type Enrollment,
  type User,
} from "../libs/types.ts";

// In-memory "database"
export let students: Student[] = [
  {
    studentId: "680610001",
    firstName: "Matt",
    lastName: "Damon",
    program: "CPE",
  },
  {
    studentId: "680610002",
    firstName: "Cillian",
    lastName: "Murphy",
    program: "CPE",
    courses: ["261207", "261497"],
  },
  {
    studentId: "680615003",
    firstName: "Emily",
    lastName: "Blunt",
    program: "ISNE",
    courses: ["269101", "261497"],
  },
];

export let courses: Course[] = [
  {
    courseId: "261207",
    courseTitle: "Basic Computer Engineering Lab",
    instructors: ["Dome", "Chanadda"],
  },
  {
    courseId: "261497",
    courseTitle: "Full Stack Development",
    instructors: ["Dome", "Nirand", "Chanadda"],
  },
  {
    courseId: "269101",
    courseTitle: "Introduction to Information Systems and Network Engineering",
    instructors: ["KENNETH COSH"],
  },
];

export let enrollments: Enrollment[] = [
  {
    studentId: "680610002",
    courseId: "261207",
  },
  {
    studentId: "680610002",
    courseId: "261497",
  },
  {
    studentId: "680615003",
    courseId: "269101",
  },
  {
    studentId: "680615003",
    courseId: "261497",
  },
];

export let users: User[] = [
  {
    username: "user1@abc.com",
    password: "1234",
    studentId: "680610001",
    role: "STUDENT",
  },
  {
    username: "user2@abc.com",
    password: "1234",
    studentId: "680610002",
    role: "STUDENT",
  },
  {
    username: "user3@abc.com",
    password: "1234",
    studentId: "680615003",
    role: "STUDENT",
  },
  {
    username: "user4@abc.com",
    password: "5678",
    studentId: null,
    role: "ADMIN",
  },
];

export const DB = {
  students,
  courses,
  enrollments,
  users,
};

// เก็บข้อมูล Original สำหรับใช้ตอน Reset
const org_users = structuredClone(users);
const org_students = structuredClone(students);
const org_courses = structuredClone(courses);
const org_enrollments = structuredClone(enrollments);

// 💡 แก้ไขลอจิกการ Reset: ล้างข้อมูลใน Array เดิมออก แล้วค่อย Push เข้าไปใหม่
// วิธีนี้ Reference จะไม่ขาดจากตัวแปร DB ชัวร์ครับ
export function reset_db() {
  reset_users();
  reset_students();
  reset_courses();
  reset_enrollments();
}

export function reset_users() {
  users.length = 0;
  users.push(...structuredClone(org_users));
}

export function reset_students() {
  students.length = 0;
  students.push(...structuredClone(org_students));
}

export function reset_courses() {
  courses.length = 0;
  courses.push(...structuredClone(org_courses));
}

export function reset_enrollments() {
  enrollments.length = 0;
  enrollments.push(...structuredClone(org_enrollments));
}