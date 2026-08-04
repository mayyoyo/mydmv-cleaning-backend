async function signContract() {

  try {

    const res = await fetch(
      "http://localhost:5000/api/contracts/sign",
      {
        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          name:
          document.getElementById("name").value,

          email:
          document.getElementById("email").value,

          phone:
          document.getElementById("phone").value,

          typedName:
          document.getElementById("typedName").value,

          signature:
          signaturePad.toDataURL(),

          contractType:
          document.getElementById("contractType").value

        })

      });


    const data = await res.json();


    console.log("CONTRACT RESPONSE:",data);


    if(data.success && data.contract){

      alert("✅ Contract signed successfully");

      window.location.href =
      "http://localhost:5000" + data.contract;

    }
    else{

      alert(
        "❌ Contract Error: " + data.error
      );

    }


  }

  catch(err){

    console.log(err);

    alert("❌ Server connection failed");

  }

}