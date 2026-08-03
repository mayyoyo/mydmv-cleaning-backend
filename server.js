require("dotenv").config({ path:"./.env" });


const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const { v4: uuidv4 } = require("uuid");
const { Server } = require("socket.io");
const Stripe = require("stripe");

const app = express();

const server = http.createServer(app);


const io = new Server(server,{
    cors:{
        origin:"*"
    }
});


const stripe = Stripe(
    process.env.STRIPE_SECRET_KEY
);



/* =========================
        MIDDLEWARE
========================= */

app.use(cors());


app.use(
    express.json({
        limit:"10mb"
    })
);


app.use(
    express.static(
        path.join(__dirname,"public")
    )
);

// 
// =========================
// SIGNED FILE ACCESS
// =========================

app.use(
"/signed-contracts",
express.static(
path.join(
__dirname,
"public",
"signed-contracts"
)
)
);


app.use(
"/signatures",
express.static(
path.join(
__dirname,
"public",
"signatures"
)
)
);
// 


/* =========================
        SIGN CONTRACT
========================= */


/* =========================
        SIGN CONTRACT
========================= */

app.post(
"/api/contracts/sign",
async(req,res)=>{

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

success:false,

error:"Missing required information"

});

}




// CREATE FOLDERS

const signatureFolder =
path.join(
__dirname,
"public",
"signatures"
);



const pdfFolder =
path.join(
__dirname,
"public",
"signed-contracts"
);




if(!fs.existsSync(signatureFolder)){

fs.mkdirSync(
signatureFolder,
{
recursive:true
}
);

}




if(!fs.existsSync(pdfFolder)){

fs.mkdirSync(
pdfFolder,
{
recursive:true
}
);

}




// UNIQUE ID

const id =
uuidv4();




// SAVE SIGNATURE IMAGE

const signatureData =
signature.replace(
"data:image/png;base64,",
""
);



const signaturePath =
path.join(
signatureFolder,
`${id}.png`
);



fs.writeFileSync(
signaturePath,
signatureData,
"base64"
);






// CREATE PDF

const pdfPath =
path.join(
pdfFolder,
`${id}.pdf`
);



const pdf =
new PDFDocument();



pdf.pipe(
fs.createWriteStream(pdfPath)
);




pdf.fontSize(20)
.text(
"My DMV Cleaning Services LLC",
{
align:"center"
}
);



pdf.moveDown();



pdf.fontSize(16)
.text(
contractType || "Service Agreement"
);



pdf.moveDown();



pdf.fontSize(12)
.text(
`
SIGNED AGREEMENT


Name:
${name}


Email:
${email}


Phone:
${phone}


Electronic Signature:
${typedName}


Date:
${new Date().toLocaleString()}


Signature:
`
);



pdf.image(
signaturePath,
{
width:200
}
);



pdf.end();







// SAVE FOR ADMIN DASHBOARD

const contract = {


id:id,


name:name,


email:email,


phone:phone,


contractType:
contractType || "Service Agreement",


pdfUrl:
`/signed-contracts/${id}.pdf`,


signature:
`/signatures/${id}.png`,


createdAt:
new Date()


};





contracts.push(contract);





res.json({

success:true,

contract

});





}

catch(error){


console.log(
"SIGN ERROR:",
error
);



res.status(500).json({

success:false,

error:"Server error"

});


}


});

// 
/* =========================
        DATA STORAGE
========================= */


const dataFolder =
path.join(__dirname,"data");


const bookingFile =
path.join(
    dataFolder,
    "bookings.json"
);


let bookings=[];


let contracts=[];



if(!fs.existsSync(dataFolder)){

    fs.mkdirSync(dataFolder);

}



if(!fs.existsSync(bookingFile)){

    fs.writeFileSync(
        bookingFile,
        "[]"
    );

}



function loadBookings(){

    try{

        bookings =
        JSON.parse(
            fs.readFileSync(
                bookingFile,
                "utf8"
            )
        );

    }
    catch(err){

        bookings=[];

    }

}



function saveBookings(){

    fs.writeFileSync(
        bookingFile,
        JSON.stringify(
            bookings,
            null,
            2
        )
    );

}



loadBookings();





/* =========================
          EMAIL
========================= */


const transporter =
nodemailer.createTransport({

    service:"gmail",

    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }

});





/* =========================
          JWT
========================= */


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


        jwt.verify(
            token,
            process.env.JWT_SECRET ||
            "admin-secret-key"
        );


        next();


    }
    catch(err){


        return res.status(403).json({
            error:"Invalid token"
        });


    }


}
/* =========================
        ADMIN LOGIN
========================= */


app.post("/admin/login",(req,res)=>{


    const {
        username,
        password
    } = req.body;



    if(
        username==="admin" &&
        password==="123456"
    ){


        const token =
        jwt.sign(
            {
                username
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






/* =========================
        CHECK AVAILABLE SLOTS
========================= */


app.get(
"/api/bookings-by-date/:date",
(req,res)=>{


    const date =
    req.params.date;



    const slots =
    bookings

    .filter(
        b =>
        b.date === date &&
        b.status !== "cancelled"
    )

    .map(
        b =>
        b.timeSlot
    );



    res.json(slots);


});








/* =========================
        BLOCKED DATES
========================= */


app.get(
"/api/blocked-dates",
(req,res)=>{


    const dates =
    [
        ...new Set(

            bookings

            .filter(
                b =>
                b.status !== "cancelled"
            )

            .map(
                b=>b.date
            )

        )
    ];



    res.json(dates);


});









/* =========================
        CREATE STRIPE DEPOSIT
========================= */


app.post(
"/api/create-deposit-checkout",
async(req,res)=>{


try{


const booking =
req.body;



const deposit =
Math.round(
    booking.price * 0.25 * 100
)
/
100;



const session =
await stripe.checkout.sessions.create({

    payment_method_types:[
        "card"
    ],


    line_items:[{


        price_data:{

            currency:"usd",


            product_data:{

                name:
                booking.service

            },


            unit_amount:
            Math.round(
                deposit * 100
            )


        },


        quantity:1


    }],



    mode:"payment",



    success_url:

    `${process.env.FRONTEND_URL || "http://localhost:3000"}/success.html`,



    cancel_url:

    `${process.env.FRONTEND_URL || "http://localhost:3000"}/booking.html`,



    metadata:{

        name:booking.name,

        email:booking.email,

        phone:booking.phone,

        service:booking.service,

        date:booking.date,

        timeSlot:booking.timeSlot,

        price:booking.price

    }


});



res.json({

    success:true,

    url:
    session.url

});



}
catch(err){


console.log(
"Stripe Error:",
err
);


res.status(500).json({

    error:"Stripe failed"

});


}



});









/* =========================
        PAY LATER BOOKING
========================= */


app.post(
"/api/book-pay-later",
async(req,res)=>{


try{


const booking = {


_id:
Date.now().toString(),



...req.body,



deposit:
Number(
req.body.deposit || 0
),



remaining:
Number(
req.body.price
),



status:
"pending",



contractSigned:
false,



createdAt:
new Date()


};




bookings.push(
booking
);



saveBookings();



io.emit(
"booking-updated"
);






// confirmation email


if(booking.email){


await transporter.sendMail({

from:
process.env.EMAIL_USER,


to:
booking.email,


subject:
"My DMV Cleaning Services Booking Confirmation",



text:

`
Thank you ${booking.name}.

Your booking request has been received.

Service:
${booking.service}

Date:
${booking.date}

Time:
${booking.timeSlot}

Status:
Pending confirmation.

Thank you.
`

});


}




res.json({

success:true,

booking

});




}
catch(err){


console.log(err);


res.status(500).json({

error:"Booking failed"

});


}



});

/* =========================
        GET BOOKINGS ADMIN
========================= */


app.get(
"/api/bookings",
verifyAdmin,
(req,res)=>{


    res.json(bookings);


});









/* =========================
        ADMIN UPDATE STATUS
========================= */


app.put(
"/admin/approve/:id",
verifyAdmin,
(req,res)=>{


const booking =
bookings.find(
b=>b._id == req.params.id
);



if(!booking){

return res.status(404).json({

error:"Booking not found"

});

}



booking.status =
"deposit-paid";



saveBookings();



io.emit(
"booking-updated"
);



res.json({

success:true

});



});







app.put(
"/admin/pending/:id",
verifyAdmin,
(req,res)=>{


const booking =
bookings.find(
b=>b._id == req.params.id
);



if(!booking){

return res.status(404).json({

error:"Booking not found"

});

}



booking.status =
"pending";



saveBookings();



io.emit(
"booking-updated"
);



res.json({

success:true

});


});








app.put(
"/admin/cancel/:id",
verifyAdmin,
(req,res)=>{


const booking =
bookings.find(
b=>b._id == req.params.id
);



if(!booking){

return res.status(404).json({

error:"Booking not found"

});

}



booking.status =
"cancelled";



saveBookings();



io.emit(
"booking-updated"
);



res.json({

success:true

});


});









/* =========================
        DELETE BOOKING
========================= */


app.delete(
"/admin/delete/:id",
verifyAdmin,
(req,res)=>{


bookings =
bookings.filter(

b =>
b._id != req.params.id

);



saveBookings();



io.emit(
"booking-updated"
);



res.json({

success:true

});


});









/* =========================
        CREATE CONTRACT PDF
========================= */


function createContractPDF(contract){


return new Promise(
(resolve,reject)=>{


const fileName =
`contract-${contract.id}.pdf`;



const filePath =
path.join(

__dirname,

"public",

"invoices",

fileName

);





if(
!fs.existsSync(
path.join(__dirname,"public","invoices")
)
){

fs.mkdirSync(
path.join(__dirname,"public","invoices")
);

}




const doc =
new PDFDocument();



const stream =
fs.createWriteStream(
filePath
);



doc.pipe(stream);



doc.fontSize(20)
.text(
"My DMV Cleaning Services LLC",
{
align:"center"
}
);



doc.moveDown();



doc.fontSize(15)
.text(
"Client Service Contract"
);



doc.moveDown();



doc.text(
`Name: ${contract.name}`
);



doc.text(
`Email: ${contract.email}`
);



doc.text(
`Service: ${contract.contractType}`
);



doc.text(
`Signed Name: ${contract.typedName}`
);



doc.text(
`Date: ${contract.createdAt}`
);



doc.end();





stream.on(
"finish",
()=>{

resolve(
"/invoices/"+fileName
);

}
);



stream.on(
"error",
reject
);



});

}





/* =========================
        SIGN CONTRACT
========================= */
/* =========================
        SIGN CONTRACT TEST
========================= */


// app.post(
// "/api/sign-contract",
// async(req,res)=>{


// console.log("SIGN REQUEST RECEIVED");

// console.log(req.body);



// try{


// res.json({

// success:true,

// message:"Contract received successfully",

// contract:req.body

// });


// }



// catch(err){


// console.log(
// "SIGN CONTRACT ERROR:"
// );


// console.error(err);



// res.status(500).json({

// success:false,

// error:err.message

// });


// }



// });
/* =========================
        GET CONTRACTS
========================= */


app.get(
"/api/admin/contracts",
verifyAdmin,
(req,res)=>{

    res.json(contracts);

});







/* =========================
        HOME TEST
========================= */


app.get(
"/",
(req,res)=>{

    res.send(
        "My DMV Cleaning Services Server Running"
    );

});







/* =========================
        START SERVER
========================= */


const PORT =
process.env.PORT || 3000;



server.listen(
PORT,
()=>{

console.log(
`🚀 Server running on port ${PORT}`
);


});