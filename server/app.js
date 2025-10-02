import express from 'express';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import User from "./routers/User.js";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
})
);

  const corsOptions = {
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}
  

app.use(cors(corsOptions));

app.use("/api/v1", User);

app.get("/", (req, res) => {
    res.send("Server is Working");
})

