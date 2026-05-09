import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/clerk-react";

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>

      <h1>My Website</h1>

      {/* 🔐 AUTH UI */}
      <SignedOut>
        <div style={{ display: "flex", gap: "10px" }}>
          <SignInButton />
          <SignUpButton />
        </div>
      </SignedOut>

      {/* 👤 AFTER LOGIN */}
      <SignedIn>
        <UserButton />
      </SignedIn>

      {/* 🧠 YOUR OLD APP GOES HERE */}
      <div id="app"></div>

    </div>
  );
}