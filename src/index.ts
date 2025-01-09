
import express from "express"
import rateLimit from "express-rate-limit"
import jwt from "jsonwebtoken"
import axios from "axios"
import prisma from "./db/db";
import { authenticatapikey } from "./middleware/auth";
import Queue from "queue"
import dotenv from "dotenv";
dotenv.config();

const app=express();
app.use(express.json());

const JWT=process.env.JWT_SECRET || "secret-key"

const limit=rateLimit({
  windowMs:15*60*1000,
  max:100,
  message:"so many requests"
}
)

app.use(limit);


const requetqueue:Record<string,Queue>={};



interface RateLimitConfig{
  requestcount:number;
  timewindow:number;
  strategy:"slidingwindow " | "ficed"
}

//user register enpoint where user register as username and get an apikey
app.post("/auth",async (req,res)=> {
  const {username}=req.body ;

    if(!username) {
      res.status(400).json({message:"username is required"})
      return 
    }

  const apikey=jwt.sign({username},JWT)
      
   try {
    const data=await prisma.user.create({
    data:{
      username,
      apikey:apikey
    }
  })


    res.status(200).json(data);
   } catch (error) {
      res.status(400).json({message:"user not register "})
   }
  
}
)

interface RegisterApp{
   baseUrl:string,
   ratelimitconfig:RateLimitConfig
}

//user register app endpoint where user  with apikey and hit tthe api with 
app.post("/registerapi",authenticatapikey,async (req,res)=>{
   
  const {userId}=req.body;
  const {baseUrl,ratelimitconfig}:RegisterApp=req.body;
   
   if (!baseUrl || !ratelimitconfig) {
    res.status(400).json({ message: "base url and rate limit config are required" });
    return;
  }

     try {
       const app=await prisma.app.create({
        data:{
          userId,
          baseUrl:baseUrl,
          RatelimitConfig:JSON.stringify(ratelimitconfig)
        }
       })

       if(!requetqueue[app.id]){
         requetqueue[app.id]=new Queue({
          concurrency:1,

         })
       }
 
       res.status(200).json(app)
     } catch (error) {
       res.status(400).json({message:"failed register "})
     }

})


const requestcount: Record<string, { count: number; lastreq: number }> = {};

//proxy server enpoint with rate limit method (slidiing window)
app.use('/apis/:apiid/*',authenticatapikey,async (req,res)=>{
     const { apiid } =req.params;

    try {
     const app=await prisma.app.findUnique({
      where:{
        id:apiid
      }
     });

     if(!app){
        res.status(404).json({
          mess:"not found"
        })
        return;
     }

     const ratelimitconfig: RateLimitConfig = JSON.parse(app.RatelimitConfig);
    
   
     const currenttime = Date.now();

  if (!requestcount[apiid]) {
    requestcount[apiid] = { count: 0, lastreq: currenttime };
  }

  const elapsedtime = currenttime - requestcount[apiid].lastreq;

  if (elapsedtime >   ratelimitconfig.timewindow) {
       
    requestcount[apiid].count = 0;
    requestcount[apiid].lastreq = currenttime;
  }

 else if 
 (requestcount[apiid].count >= ratelimitconfig.requestcount) {
      res.status(429).json({message:"rate limit excedd"})
       return;
  }else {
     requestcount[apiid].count++; 

  }
  
     const queue=requetqueue[apiid];

      if (!queue){
        res.status(400).json("queue  not ")
        return
      }

       queue.push(async ()=>{
          const url=`${app?.baseUrl}${req.path.replace(`/apis/${apiid}`,"")}`;
             
     
  
       const response=await axios({
        url,
        method:req.method,
        headers:req.headers,
        data:req.body

       }) 

      res.status(200).json(response.data)
       })

       queue.start();
     } catch (error) {
        res.status(500).json({message:"error "})
     }
})



const PORT =3000;


app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});

