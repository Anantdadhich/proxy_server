
import express from "express"
import rateLimit from "express-rate-limit"
import jwt from "jsonwebtoken"
import axios from "axios"
import prisma from "./db/db";
import { authenticatapikey } from "./middleware/auth";


const app=express();
app.use(express.json());


const limit=rateLimit({
  windowMs:15*60*1000,
  max:100,
  message:"so many requests"
}
)

app.use(limit);

interface RateLimitConfig{
  requestcount:number;
  timewindow:number;
  strategy:"window " | "fixed"
}


app.post("/auth",async (req,res)=> {
  const {username}=req.body ;

    if(!username) {
      res.status(400).json({message:"username is required"})
      return 
    }

  const apikey=jwt.sign({username}, "secret_ket")
      
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


app.post("/registerapi",authenticatapikey,async (req,res)=>{
   
 
  //@ts-ignore
  const userId=(req.user as any ).id
  const {baseUrl,ratelimitconfig}:RegisterApp=req.body;

     try {
       const app=await prisma.app.create({
        data:{
          userId,
          baseUrl:baseUrl,
          RatelimitConfig:JSON.stringify(ratelimitconfig)
        }
       })
 
       res.status(200).json(app)
     } catch (error) {
       res.status(400).json({message:"failed register "})
     }

})


const requestcount: Record<string, { count: number; lastreq: number }> = {};


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

  const elapsedTime = currenttime - requestcount[apiid].lastreq;

  if (elapsedTime > ratelimitconfig.timewindow) {
    requestcount[apiid].count = 0;
    requestcount[apiid].lastreq = currenttime;
  }

  if (requestcount[apiid].count >= ratelimitconfig.requestcount) {
      res.status(429).json({message:"rate limit excedd"})

  }
   requestcount[apiid].count++; 

     const url=`${app?.baseUrl}${req.path.replace(`/apis/${apiid}`,"")}`;
             

  
       const response=await axios({
        url,
        method:req.method,
        headers:req.headers,
        data:req.body

       }) 

      res.status(200).json(response.data)
     } catch (error) {
        res.status(500).json({message:"error "})
     }
})



const PORT =3000;


app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});