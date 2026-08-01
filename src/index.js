//require ('dotenv').config({path:'/.env'})
import dotenv from "dotenv"
//import express from "express";
import connectDB from "./db/index.js";
import app from "./app.js";

//const app = express();

dotenv.config({path:'./.env'})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
    console.log(`Server running on port ${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.error("Database Connection Error:", error);
})




// ;(async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
//         console.log("Database Connected");

//         app.on("error", (error) => {
//             console.error("App Error:", error);
//             throw error;
//         });

//         app.listen(process.env.PORT, () => {
//             console.log(`Server running on port ${process.env.PORT}`);
//         });

//     } catch (error) {
//         console.error("Database Connection Error:", error);
//     }
// })();