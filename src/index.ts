import express, { type Request, type Response } from "express";



// import middlewares

import morgan from "morgan";

import invalidJsonMiddleware from "./middlewares/invalidJsonMiddleware.ts";

import notFoundMiddleware from "./middlewares/notFoundMiddleware.ts";



// import routes

import studentRouter_v2 from "./routes/studentsRoutes_v2.ts";

import studentRouter_v3 from "./routes/studentsRoutes_v3.ts";

import courseRouter_v2 from "./routes/coursesRouters_v2.ts";

import enrollmentRouter_v2 from "./routes/enrollmentsRouters_v2.ts";



const app = express();

const port = 3000;



// body parser middleware

app.use(express.json());



// logger middleware

app.use(morgan("dev"));

// app.use(morgan("combined"));



// JSON parser middleware

app.use(invalidJsonMiddleware);








// Endpoints

app.get("/", (req: Request, res: Response) => {

  res.send("Lecture09 API services");

});
app.get("/api/me", (req: Request, res: Response) => {

  return res.json({

    success: true,

    message: "Student Information",

    data: {

      studentId: "680610694",

      firstname: "Pannawat",

      lastname: "Wongkeawjan",

      program: "CPE",    

      section: "001"

    }

  });

});







app.use("/api/v2/students", studentRouter_v2);

app.use("/api/v3/students", studentRouter_v3);

app.use("/api/v2/courses", courseRouter_v2);

app.use("/api/v2/enrollments", enrollmentRouter_v2);



// endpoint check middleware

app.use(notFoundMiddleware);

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}





export default app; 

