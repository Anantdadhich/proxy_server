import express from "express"
import rateLimit from "express-rate-limit"
const app=express();

app.use(express.json());

const limit=rateLimit({
  windowMs:10*60*1000,
  max:100,
})

app.use(limit);

const PORT =3000;


app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
