import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconLock,
  IconShieldLock,
  IconAlertCircle,
} from "@tabler/icons-react";

export function PasswordChangeForm({ onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const validateForm = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = "Please enter your current password to continue";
      }
    } else {
      if (!formData.newPassword) {
        newErrors.newPassword = "Please enter a new password";
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = "Password must be at least 6 characters long for security";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your new password";
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "The passwords you entered don't match. Please try again";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateCurrentPassword = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before continuing");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Verifying your current password...");
    
    try {
      // First get the current user's email
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.dismiss(loadingToast);
        throw new Error("Unable to verify your account. Please try again.");
      }

      // Now verify the password
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      });

      if (error) {
        toast.dismiss(loadingToast);
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("The current password you entered is incorrect");
        }
        throw error;
      }
      
      toast.dismiss(loadingToast);
      toast.success("Current password verified successfully");
      
      setStep(2);
      setErrors({}); // Clear any previous errors
    } catch (error) {
      console.error("Password verification error:", error);
      setErrors({ currentPassword: error.message || "Unable to verify current password" });
      toast.error(error.message || "Unable to verify current password");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before updating your password");
      return;
    }

    setLoading(true);

    try {
      const loadingToast = toast.loading("Updating your password...");

      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (error) {
        if (error.message.includes("rate limit")) {
          throw new Error("Too many attempts. Please wait a moment before trying again.");
        }
        throw error;
      }

      toast.dismiss(loadingToast);
      toast.success("Your password has been updated successfully");

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
      setStep(1);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Password update error:", error);
      setErrors({ newPassword: error.message || "Failed to update password" });
      toast.error(error.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Change Password</CardTitle>
        <CardDescription>
          {step === 1
            ? "Enter your current password to continue"
            : "Enter your new password"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className={`pl-9 ${errors.currentPassword ? "border-destructive" : ""}`}
                  placeholder="Enter your current password"
                />
              </div>
              {errors.currentPassword && (
                <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                  <IconAlertCircle className="h-4 w-4" />
                  <p>{errors.currentPassword}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <IconShieldLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className={`pl-9 ${errors.newPassword ? "border-destructive" : ""}`}
                  placeholder="Enter new password"
                />
              </div>
              {errors.newPassword && (
                <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                  <IconAlertCircle className="h-4 w-4" />
                  <p>{errors.newPassword}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <IconShieldLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`pl-9 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  placeholder="Confirm new password"
                />
              </div>
              {errors.confirmPassword && (
                <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                  <IconAlertCircle className="h-4 w-4" />
                  <p>{errors.confirmPassword}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step === 1 ? (
          <Button
            onClick={validateCurrentPassword}
            disabled={loading || !formData.currentPassword}
            className="w-full"
          >
            {loading ? (
              "Verifying..."
            ) : (
              <>
                Continue
                <IconArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setErrors({});
              }}
              disabled={loading}
              className="flex-1"
            >
              <IconArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={loading || !formData.newPassword || !formData.confirmPassword}
              className="flex-1"
            >
              {loading ? (
                "Updating..."
              ) : (
                <>
                  Update Password
                  <IconCheck className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
} 