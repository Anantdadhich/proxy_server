import { NextFunction,Request,Response } from "express";
import jwt from "jsonwebtoken"
import prisma from "../db/db";



export const authenticatapikey=async (req:Request,res:Response,next:NextFunction)=>{
    
    const apikey=req.headers["x-api-key"];

    if (!apikey){
      res.status(401).json({message:"api key required"})
      return;
    }

    try  {
      const user=await prisma.user.findUnique({
           where:{
            apikey:String(apikey)
           }
      })

          if(!user){
            res.status(401).json({messgae:"invalid api key "})
             return
        }

         const decoded = jwt.verify(apikey as string,  "secret-key");
         //@ts-ignore
         req.user = decoded;
        next();
    } catch (error) {
         res.status(401).json({message:"invalid api key "})
    }
}

