// ===============================
// SIGNATURE CANVAS
// ===============================

const canvas = document.getElementById("canvas");

let ctx = null;
let drawing = false;



if (canvas) {

    ctx = canvas.getContext("2d");

    ctx.lineWidth = 2;
    ctx.lineCap = "round";


    canvas.addEventListener(
        "mousedown",
        function(e){

            drawing = true;

            ctx.beginPath();

            ctx.moveTo(
                e.offsetX,
                e.offsetY
            );

        }
    );



    canvas.addEventListener(
        "mousemove",
        function(e){


            if(!drawing) return;


            ctx.lineTo(
                e.offsetX,
                e.offsetY
            );


            ctx.stroke();


        }
    );



    canvas.addEventListener(
        "mouseup",
        function(){

            drawing = false;

        }
    );



    canvas.addEventListener(
        "mouseleave",
        function(){

            drawing = false;

        }
    );

}



// ===============================
// MOBILE TOUCH SIGNATURE
// ===============================


if(canvas){


canvas.addEventListener(
"touchstart",
function(e){


e.preventDefault();


drawing = true;


const rect =
canvas.getBoundingClientRect();


const touch =
e.touches[0];



ctx.beginPath();


ctx.moveTo(

touch.clientX - rect.left,

touch.clientY - rect.top

);



}
);



canvas.addEventListener(
"touchmove",
function(e){


e.preventDefault();


if(!drawing) return;



const rect =
canvas.getBoundingClientRect();



const touch =
e.touches[0];



ctx.lineTo(

touch.clientX - rect.left,

touch.clientY - rect.top

);



ctx.stroke();


}
);



canvas.addEventListener(
"touchend",
function(){

drawing=false;

}
);


}



// ===============================
// CLEAR SIGNATURE
// ===============================


function clearCanvas(){


if(!canvas || !ctx) return;



ctx.clearRect(

0,

0,

canvas.width,

canvas.height

);


}







// ===============================
// SUBMIT CONTRACT
// ===============================


async function submitContract(){



const data = {


name:

document
.getElementById("name")
.value
.trim(),



email:

document
.getElementById("email")
.value
.trim(),



phone:

document
.getElementById("phone")
.value
.trim(),



typedName:

document
.getElementById("typedName")
.value
.trim(),



contractType:

"Client Service Agreement",



signature:

canvas
? canvas.toDataURL("image/png")
: ""



};







// VALIDATION


if(
!data.name ||
!data.email ||
!data.typedName ||
!data.signature
){


alert(
"Please complete your information and signature"
);


return;


}







try{



const res =

await fetch(

"/api/contracts/sign",

{


method:"POST",


headers:{


"Content-Type":

"application/json"


},


body:

JSON.stringify(data)


}


);







const result =

await res.json();








if(result.success){



alert(

"Contract signed successfully!"

);






// OPEN GENERATED PDF


window.open(

result.contract.pdfUrl,

"_blank"

);






// OPTIONAL REDIRECT


// window.location.href="../documents.html";



}

else{


alert(

result.error ||

"Signing failed"

);


}



}

catch(error){



console.log(

"SIGN ERROR:",

error

);



alert(

"Server connection error"

);



}



}