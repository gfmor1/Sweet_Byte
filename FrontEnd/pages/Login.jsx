import {useState} from 'react';

function Login({onLoginSuccess}) {
    const [email, setEmail]=useState("");
    const[password, setPassword]=useState("");
    const [message,setMessage]=useState("");

   
function handleLogin(event) {
  event.preventDefault();

  if (
    email === "customer@sweetbyte.test" &&
    password === "demo123"
  ) {
    onLoginSuccess({
      email: email,
      role: "customer"
    });
  } else if (
    email === "restaurant@sweetbyte.test" &&
    password === "demo123"
  ) {
    onLoginSuccess({
      email: email,
      role: "restaurant",
      restaurantId: 1
    });
  } else {
    setMessage("Invalid email or password");
  }
}


    return(
        <div>
            <h1>SweetByte</h1>
            <h2> Login</h2>
           <form onSubmit={handleLogin}>
            <input
             type="email" 
             placeholder="Email"
             value={email}
             onChange={(event)=>setEmail(event.target.value)}
             required
             />
             <input
             type="password"
             placeholder="Password"
             value={password}
             onChange={(event)=>setPassword(event.target.value)}
             required
             />
             <button type="submit">Login</button>

           </form>
           <p>{message}</p>
        </div>
        
    )
    
}
export default Login;