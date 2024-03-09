import express from "express";
const app=express();
const port=3000;

app.get("/",(req,res)=>{
    res.send("<h1>Hello</h1>");
});

app.get("/contact",(req,res)=>{
    res.send("<h1>637281683</h1>");
});

app.get("/about",(req,res)=>{
    res.send("<h1>Hi my name is Nikhila M");
})
app.listen(port,()=>{
    console.log(`Server is running on port ${port}.`);
});