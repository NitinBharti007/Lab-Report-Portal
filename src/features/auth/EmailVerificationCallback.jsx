import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader } from "@/components/shared/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconMail, IconCheck } from "@tabler/icons-react";

export default function EmailVerificationCallback() {
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

  console.log("Component rendered with location:", location); // Debug log for component mount

  useEffect(() => {
    console.log("Effect running with location:", location); // Debug log for effect
    const handleEmailVerification = async () => {
      try {
        // Check both hash and search params
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        console.log("Current hash:", hash); // Debug log
        console.log("Search params:", searchParams.toString()); // Debug log

        // Check for first verification (old email)
        if (hash.includes("Confirmation+link+accepted") || searchParams.get("message")?.includes("Confirmation link accepted")) {
          console.log("First verification detected"); // Debug log
          setStep(1);
          setMessage("First verification successful! Please check your new email to complete the process.");
          return;
        }

        // Check for second verification (new email)
        if (hash.includes("type=email_change") || searchParams.get("type") === "email_change") {
          console.log("Second verification detected"); // Debug log
          setStep(2);
          
          // Get the session after email verification
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log("Session data:", session); // Debug log for session
          
          if (sessionError) throw sessionError;

          if (session) {
            // Get the current user's email from auth
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            console.log("User data:", user); // Debug log for user
            if (userError) throw userError;

            // Get the current user from the users table
            const { data: currentUser, error: fetchError } = await supabase
              .from("users")
              .select("*")
              .eq("user_id", session.user.id)
              .single();

            console.log("Current user data:", currentUser); // Debug log for current user
            if (fetchError) throw fetchError;

            // Only update if the email is different
            if (currentUser.email !== user.email) {
              const { error: updateError } = await supabase
                .from("users")
                .update({ 
                  email: user.email,
                  last_modified: new Date().toISOString()
                })
                .eq("user_id", session.user.id);

              if (updateError) throw updateError;
            }

            // Show success message before redirecting
            setMessage("Email updated successfully!");
            
            // Wait a moment to show the success message
            setTimeout(() => {
              navigate("/account", { 
                state: { 
                  message: "Email updated successfully!",
                  user: { ...currentUser, email: user.email }
                }
              });
            }, 2000);
          } else {
            throw new Error("No session found after email verification");
          }
        }
      } catch (err) {
        console.error("Email verification error:", err);
        setError(err.message);
      }
    };

    handleEmailVerification();
  }, [navigate, location]);

  // Debug log for current state
  console.log("Current state:", { step, error, message });

  if (error) {
    console.log("Rendering error state"); // Debug log for error state
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Verification Error</CardTitle>
            <CardDescription>There was a problem verifying your email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-destructive">{error}</p>
            <Button 
              onClick={() => navigate("/account")}
              className="w-full"
            >
              Return to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (message) {
    console.log("Rendering message state"); // Debug log for message state
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <IconCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">Success!</CardTitle>
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              Redirecting to profile page...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 1) {
    console.log("Rendering step 1 state"); // Debug log for step 1 state
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <IconCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">First Step Complete!</CardTitle>
            <CardDescription className="text-center">
              Your current email has been verified successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
              <IconMail className="h-5 w-5 text-primary" />
              <p className="text-sm">
                Please check your new email address for the second verification link to complete the process.
              </p>
            </div>
            <Button 
              onClick={() => navigate("/account")}
              variant="outline"
              className="w-full"
            >
              Return to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("Rendering loading state"); // Debug log for loading state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <Loader message="Verifying your email..." />
      </div>
    </div>
  );
} 