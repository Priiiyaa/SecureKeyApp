import dotenv from 'dotenv';
import { app } from './app.js'
import { connectDB } from './config/database.js'
import cloudinary from 'cloudinary';


dotenv.config({
    path: "./.env"
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const mongoURI = process.env.MONGO_URI;

connectDB(mongoURI);


app.listen(process.env.PORT, () =>{
    console.log(`Server running on port ${process.env.PORT}`)
})