// ==========================
// LOAD ENV
// ==========================
require("dotenv").config();


// ==========================
// IMPORTS
// ==========================
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const sqlite3 = require("sqlite3").verbose();
const Stripe = require("stripe");
const nodemailer = require("nodemailer");


// ==========================
// APP CONFIG
// ==========================
const app = express();

const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
process.env.FRONTEND_URL ||
"http://localhost:5000";


// ==========================
// STRIPE
// ==========================
const stripe = Stripe(
process.env.STRIPE_SECRET_KEY
);


// ==========================
// MIDDLEWARE
// ==========================
app.use(cors());

app.use(
express.json({
limit:"10mb"
})
);

app.use(
express.urlencoded({
extended:true
})
);


// ==========================
// STATIC FILES
// ==========================
app.use(
express.static(
path.join(
__dirname,
"public"
)
)
);


// ==========================
// HOME
// ==========================
app.get("/",(req,res)=>{

res.sendFile(
path.join(
__dirname,
"public",
"index.html"
)
);

});


// ==========================
// CREATE FOLDERS
// ==========================
const folders = [

"public/signatures",

"public/signed-contracts",

"public/invoices",

"data"

];


folders.forEach(folder=>{

if(!fs.existsSync(folder)){

fs.mkdirSync(
folder,
{
recursive:true
}
);

}

});


// ==========================
// SQLITE DATABASE
// ==========================
const db =
new sqlite3.Database(
"./bookings.db",
(err)=>{

if(err){

console.log(err);

}
else{

console.log(
"SQLite connected"
);

}

});


// ==========================
// BOOKINGS TABLE
// ==========================
db.run(`

CREATE TABLE IF NOT EXISTS bookings (

id INTEGER PRIMARY KEY AUTOINCREMENT,

name TEXT,

email TEXT,

phone TEXT,

address TEXT,

service TEXT,

price REAL,

deposit REAL,

remaining REAL,

date TEXT,

timeSlot TEXT,

paymentType TEXT,

stripeSession TEXT,

status TEXT DEFAULT 'pending'

)

`);



// ==========================
// CONTRACTS TABLE
// ==========================
db.run(`

CREATE TABLE IF NOT EXISTS contracts (

id INTEGER PRIMARY KEY AUTOINCREMENT,

name TEXT,

email TEXT,

phone TEXT,

contractType TEXT,

signature TEXT,

pdfUrl TEXT,

createdAt TEXT

)

`);



// ==========================
// EMAIL SETUP
// ==========================
const transporter =
nodemailer.createTransport({

service:"gmail",

auth:{

user:
process.env.EMAIL_USER,

pass:
process.env.EMAIL_PASS

}

});


// ==========================
// SEND EMAIL FUNCTION
// ==========================
function sendEmail(
to,
subject,
html
){

return transporter.sendMail({

from:
process.env.EMAIL_USER,

to,

subject,

html

});

}



// ==========================
// ADMIN LOGIN
// ==========================
app.post(
"/api/admin/login",
(req,res)=>{


const {
username,
password
}=req.body;



if(
username==="admin" &&
password==="admin123"
){


const token =
jwt.sign(

{
username:"admin"
},

process.env.JWT_SECRET ||
"admin-secret-key",

{
expiresIn:"2h"
}

);



return res.json({

success:true,

token

});


}



res.status(401).json({

success:false,

error:"Invalid login"

});


});



// ==========================
// ADMIN AUTH
// ==========================
function verifyAdmin(req,res,next){


const header =
req.headers.authorization;


if(!header){

return res.status(401).json({

error:"No token"

});

}



const token =
header.split(" ")[1];



try{


const decoded =
jwt.verify(

token,

process.env.JWT_SECRET ||
"admin-secret-key"

);



if(decoded.username !== "admin"){

return res.status(403).json({

error:"Not admin"

});

}



next();



}
catch(err){


return res.status(403).json({

error:"Invalid token"

});


}


}
// ==========================
// GET BOOKED TIME SLOTS
// ==========================
app.get(
"/api/bookings-by-date/:date",
(req,res)=>{

const date = req.params.date;


db.all(

`
SELECT timeSlot
FROM bookings
WHERE date=?
AND status != 'cancelled'
`,

[date],

(err,rows)=>{

if(err){

return res.status(500).json([]);

}


res.json(
rows.map(
row=>row.timeSlot
)
);


});


});




// ==========================
// PAY LATER BOOKING
// ==========================
app.post(
"/api/book-pay-later",
(req,res)=>{


const data = req.body;



db.run(

`
INSERT INTO bookings

(
name,
email,
phone,
address,
service,
price,
deposit,
remaining,
date,
timeSlot,
paymentType,
status
)

VALUES
(?,?,?,?,?,?,?,?,?,?,?,?)
`,

[

data.name,

data.email,

data.phone,

data.address,

data.service,

data.price,

data.deposit,

data.remaining,

data.date,

data.timeSlot,

"pay-later",

"pending"

],


function(err){


if(err){

return res.status(500).json({

error:"Database error"

});

}



sendEmail(

data.email,

"Booking Confirmation - My DMV Cleaning Services",

`

<h2>Booking Received</h2>

<p>Hello ${data.name}</p>

<p>Your cleaning appointment has been received.</p>

<p>Service: ${data.service}</p>

<p>Date: ${data.date}</p>

<p>Time: ${data.timeSlot}</p>

<p>Total: $${data.price}</p>

<p>Deposit: $${data.deposit}</p>

`

).catch(console.log);



res.json({

success:true,

bookingId:this.lastID

});


});


});




// ==========================
// STRIPE DEPOSIT CHECKOUT
// ==========================
app.post(
"/api/create-deposit-checkout",
async(req,res)=>{


try{


const data=req.body;



const session =
await stripe.checkout.sessions.create({

payment_method_types:[

"card"

],

mode:"payment",


customer_email:
data.email,


line_items:[

{

price_data:{

currency:"usd",

product_data:{

name:
`${data.service} Deposit`

},


unit_amount:

Math.round(
data.deposit * 100
)


},


quantity:1


}

],


success_url:

`${FRONTEND_URL}/success.html`,


cancel_url:

`${FRONTEND_URL}/booking.html`


});




db.run(

`

INSERT INTO bookings

(
name,
email,
phone,
address,
service,
price,
deposit,
remaining,
date,
timeSlot,
paymentType,
stripeSession,
status
)

VALUES
(?,?,?,?,?,?,?,?,?,?,?,?,?)

`,

[

data.name,

data.email,

data.phone,

data.address,

data.service,

data.price,

data.deposit,

data.remaining,

data.date,

data.timeSlot,

"pay-now",

session.id,

"pending"

]

);



res.json({

url:session.url

});



}
catch(err){


console.log(err);


res.status(500).json({

error:"Stripe checkout failed"

});


}


});





// ==========================
// ADMIN GET BOOKINGS
// ==========================
app.get(
"/api/admin/bookings",
verifyAdmin,
(req,res)=>{


db.all(

`
SELECT *
FROM bookings
ORDER BY id DESC
`,

(err,rows)=>{


if(err){

return res.status(500).json({

error:"Database error"

});

}



res.json(rows);



});


});





// ==========================
// UPDATE BOOKING STATUS
// ==========================
app.put(
"/api/admin/bookings/:id",
verifyAdmin,
(req,res)=>{


const {
status
}=req.body;



db.run(

`

UPDATE bookings

SET status=?

WHERE id=?

`,

[

status,

req.params.id

],


(err)=>{


if(err){

return res.status(500).json({

error:"Update failed"

});

}



res.json({

success:true

});


});


});




// ==========================
// DELETE BOOKING
// ==========================
app.delete(
"/api/admin/bookings/:id",
verifyAdmin,
(req,res)=>{


db.run(

`

DELETE FROM bookings

WHERE id=?

`,

[req.params.id],


(err)=>{


if(err){

return res.status(500).json({

error:"Delete failed"

});

}



res.json({

success:true

});


});


});





// ==========================
// CHARGE REMAINING BALANCE
// ==========================
app.post(
"/api/charge-later/:id",
verifyAdmin,
async(req,res)=>{


try{


db.get(

`

SELECT *

FROM bookings

WHERE id=?

`,

[req.params.id],


async(err,booking)=>{


if(err || !booking){

return res.status(404).json({

error:"Booking not found"

});

}



const payment =
await stripe.paymentIntents.create({

amount:

Math.round(
booking.remaining * 100
),

currency:"usd"

});



db.run(

`

UPDATE bookings

SET status='paid'

WHERE id=?

`,

[req.params.id]

);



res.json({

success:true,

payment

});


});


}
catch(err){


res.status(500).json({

error:"Charge failed"

});


}


});

//

// ==========================
// CUSTOMER CONTACT EMAIL
// ==========================
app.post(
"/api/contact",
(req,res)=>{


const {
name,
email,
phone,
message
}=req.body;



if(!name || !email || !message){

return res.status(400).json({

error:"Missing fields"

});

}




sendEmail(

process.env.EMAIL_USER,

"New Contact Message - My DMV Cleaning Services",

`

<h2>New Customer Message</h2>

<p><b>Name:</b> ${name}</p>

<p><b>Email:</b> ${email}</p>

<p><b>Phone:</b> ${phone}</p>

<p><b>Message:</b></p>

<p>${message}</p>

`

)
.then(()=>{


res.json({

success:true

});


})
.catch(err=>{


console.log(err);


res.status(500).json({

error:"Email failed"

});


});


});
// 



// ==========================
// SIGN CONTRACT
// ==========================
app.post(
"/api/contracts/sign",
(req,res)=>{


try{


const {

name,

email,

phone,

typedName,

signature,

contractType


}=req.body;




if(
!name ||
!email ||
!typedName ||
!signature
){

return res.status(400).json({

error:"Missing fields"

});

}



const timestamp =
Date.now();



// SAVE SIGNATURE

const signatureFile =
`signature-${timestamp}.png`;


const signaturePath =
path.join(

__dirname,

"public",

"signatures",

signatureFile

);



const image =
signature.replace(
"data:image/png;base64,",
""
);



fs.writeFileSync(

signaturePath,

image,

"base64"

);



// CREATE PDF

const pdfFile =
`contract-${timestamp}.pdf`;


const pdfPath =
path.join(

__dirname,

"public",

"signed-contracts",

pdfFile

);



const pdf =
new PDFDocument();


const stream =
fs.createWriteStream(pdfPath);


pdf.pipe(stream);



pdf.fontSize(18)
.text(

contractType ||
"SERVICE AGREEMENT",

{
align:"center"
}

);



pdf.moveDown();


pdf.fontSize(12)
.text(`

Name: ${name}

Email: ${email}

Phone: ${phone}

Signature: ${typedName}

Date:

${new Date().toLocaleString()}

`);



pdf.image(

signaturePath,

{

width:200

}

);



pdf.end();





stream.on(
"finish",
()=>{


db.run(

`

INSERT INTO contracts

(
name,
email,
phone,
contractType,
signature,
pdfUrl,
createdAt
)

VALUES
(?,?,?,?,?,?,?)

`,

[

name,

email,

phone,

contractType || "Service Agreement",

"/signatures/"+signatureFile,

"/signed-contracts/"+pdfFile,

new Date().toISOString()

],


(err)=>{


if(err){

return res.status(500).json({

error:"Database error"

});

}



res.json({

success:true,

contract:

"/download-contract/"+pdfFile

});


});


});


}
catch(err){

console.log(err);


res.status(500).json({

error:"Server error"

});


}


});
// ==========================
// PUBLIC CONTRACT DOWNLOAD
// ==========================
app.get(
"/download-contract/:file",
(req,res)=>{


const filePath =
path.join(

__dirname,

"public",

"signed-contracts",

req.params.file

);



if(!fs.existsSync(filePath)){

return res.status(404)
.send("Contract not found");

}



res.download(filePath);


});





// ==========================
// ADMIN DOWNLOAD CONTRACT
// ==========================
app.get(
"/admin/contracts/download/:file",
verifyAdmin,
(req,res)=>{


const filePath =
path.join(

__dirname,

"public",

"signed-contracts",

req.params.file

);



if(!fs.existsSync(filePath)){

return res.status(404)
.send("File not found");

}



res.download(filePath);


});





// ==========================
// ADMIN DOWNLOAD SIGNATURE
// ==========================
app.get(
"/admin/signatures/download/:file",
verifyAdmin,
(req,res)=>{


const filePath =
path.join(

__dirname,

"public",

"signatures",

req.params.file

);



if(!fs.existsSync(filePath)){

return res.status(404)
.send("File not found");

}



res.download(filePath);


});





// ==========================
// GET SIGNED CONTRACTS
// ==========================
app.get(
"/api/admin/contracts",
verifyAdmin,
(req,res)=>{


db.all(

`

SELECT *

FROM contracts

ORDER BY id DESC

`,

(err,rows)=>{


if(err){

return res.status(500).json({

error:"Database error"

});

}



res.json(rows);



});


});





// ==========================
// DELETE CONTRACT
// ==========================
app.delete(
"/api/admin/contracts/:id",
verifyAdmin,
(req,res)=>{


const id =
req.params.id;



db.get(

`

SELECT *

FROM contracts

WHERE id=?

`,

[id],


(err,contract)=>{


if(err){

return res.status(500).json({

error:"Database error"

});

}



if(!contract){

return res.status(404).json({

error:"Contract not found"

});

}





// DELETE PDF FILE

if(contract.pdfUrl){

const pdfPath =
path.join(

__dirname,

"public",

contract.pdfUrl

);



if(fs.existsSync(pdfPath)){

fs.unlinkSync(pdfPath);

}

}





// DELETE SIGNATURE FILE

if(contract.signature){

const signaturePath =
path.join(

__dirname,

"public",

contract.signature

);



if(fs.existsSync(signaturePath)){

fs.unlinkSync(signaturePath);

}

}





// DELETE DATABASE ROW

db.run(

`

DELETE FROM contracts

WHERE id=?

`,

[id],


(err)=>{


if(err){

return res.status(500).json({

error:"Delete failed"

});

}



res.json({

success:true

});


});


});


});





// ==========================
// SERVER START
// ==========================
app.listen(

PORT,

()=>{


console.log(

`Server running on http://localhost:${PORT}`

);


});