import { useEffect, useState, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconEdit, IconCamera } from "@tabler/icons-react";
import PageLayout from "@/components/layouts/PageLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Loader } from "@/components/shared/loader";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { useAuth } from "@/context/AuthContext";

// Create User Context
export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateUser = (newUserData) => {
    setUser(newUserData);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) throw authError;

        const { data: userDetails, error: userError } = await supabase
          .from("users")
          .select("id, name, email, avatar_url, role, created_at")
          .eq("user_id", authUser.id)
          .single();

        if (userError) throw userError;

        setUser(userDetails);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getAvatarUrl(path) {
  if (!path) return null; // Return null instead of placeholder
  // If path is already a full URL, return it directly
  if (path.startsWith('http')) return path;
  // Otherwise construct from storage
  return `https://pxycafbswegyrxqiazsc.supabase.co/storage/v1/object/public/avatars/${path}`;
}

export default function UserDetails() {
  const { userDetails: globalUser, updateUserDetails } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Handle success/error messages from email verification
  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
      // Clear the message from location state
      navigate(location.pathname, { replace: true });
    }
    if (location.state?.error) {
      toast.error(location.state.error);
      // Clear the error from location state
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Initialize form data from global user
  useEffect(() => {
    if (globalUser) {
      setUser(globalUser);
      setFormData({
        name: globalUser.name || "",
        email: globalUser.email || "",
      });
    }
  }, [globalUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large. Please select an image smaller than 5MB.");
      return;
    }

    setUploadingAvatar(true);
    const loadingToast = toast.loading("Uploading avatar...");

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser || !authUser.id) {
        console.error('Auth error or missing user ID:', authError);
        throw new Error("Unable to get current user ID for avatar upload");
      }

      // Generate unique filename with extension
      const fileExt = file.name.split('.').pop();
      const fileUuid = generateUUID();
      const filePath = `${authUser.id}/${fileUuid}`;

      // First delete any existing avatar
      try {
        const { data: list, error: listError } = await supabase.storage
          .from('avatars')
          .list(authUser.id);
        
        if (listError) {
          console.error('Error listing existing avatars:', listError);
        }
        
        if (list && list.length > 0) {
          const filesToRemove = list.map(file => `${authUser.id}/${file.name}`);
          const { error: removeError } = await supabase.storage
            .from('avatars')
            .remove(filesToRemove);
          
          if (removeError) {
            console.error('Error removing existing avatars:', removeError);
          }
        }
      } catch (deleteError) {
        console.error('Error in avatar cleanup:', deleteError);
      }

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
          metadata: {
            fileExtension: fileExt
          }
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Failed to upload avatar: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user record with the public URL
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({ 
          avatar_url: publicUrl,
          last_modified: new Date().toISOString()
        })
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error details:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      setUser(updatedUser);
      updateUserDetails(updatedUser); // Update AuthContext
      toast.success("Avatar updated successfully", { id: loadingToast });
    } catch (err) {
      console.error("Avatar update error:", err);
      toast.error(err.message || "Failed to update avatar", { id: loadingToast });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    const loadingToast = toast.loading("Updating profile...");

    const { name, email } = formData;

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) throw new Error("Unable to get current user");

      // First get the user record to ensure we have the correct ID
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("user_id", authUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        throw new Error('Failed to verify user record');
      }

      if (!userRecord) {
        throw new Error('User record not found');
      }

      // Update name in users table using the database ID
      const { error: updateError } = await supabase
        .from("users")
        .update({ 
          name,
          last_modified: new Date().toISOString()
        })
        .eq("id", userRecord.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Update email if changed
      if (email !== user.email) {
        // First check if the new email is already verified
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        // Only update email in auth if it's different from the current auth email
        if (email !== authUser.email) {
          // First update the users table
          const { error: updateError } = await supabase
            .from("users")
            .update({ 
              email: email,
              last_modified: new Date().toISOString()
            })
            .eq("user_id", authUser.id);

          if (updateError) {
            throw new Error('Failed to update email in database');
          }

          // Then update auth email
          const { data: emailData, error: emailError } = await supabase.auth.updateUser({ 
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                email_updated: true
              }
            }
          });
          
          if (emailError) {
            // Revert the users table update if auth update fails
            await supabase
              .from("users")
              .update({ 
                email: authUser.email,
                last_modified: new Date().toISOString()
              })
              .eq("user_id", authUser.id);
            throw new Error(emailError.message);
          }
          
          toast.dismiss(loadingToast);
          toast.success("Please check your new email to confirm the change");
          return; // Exit early as we need email verification
        }
      }

      // Fetch fresh user data
      const { data: freshUserData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userRecord.id)
        .single();

      if (fetchError) {
        console.error('Error fetching fresh data:', fetchError);
        throw fetchError;
      }

      if (!freshUserData) {
        throw new Error('Failed to fetch updated user data');
      }

      setUser(freshUserData);
      updateUserDetails(freshUserData); // Update AuthContext
      setFormData({
        name: freshUserData.name || "",
        email: freshUserData.email || "",
      });
      setIsEditing(false);
      toast.success("Profile updated successfully", { id: loadingToast });
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update profile", { id: loadingToast });
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (!user) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader message="Loading user details..." />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="grid gap-6 max-w-3xl mx-auto">
          <Card className="border-none shadow-lg">
            <CardHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage 
                      src={getAvatarUrl(user.avatar_url)} 
                      alt={user.name || "User avatar"} 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.target.src = ''; // Clear the src to show fallback
                        console.error('Failed to load avatar image');
                      }}
                    />
                    <AvatarFallback className="bg-primary/10 text-lg">
                      {user.name ? user.name.split(" ").map(n => n[0]).join("") : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200 ${
                      uploadingAvatar 
                        ? 'bg-black/70 opacity-100 cursor-wait' 
                        : 'bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer'
                    }`}
                  >
                    {uploadingAvatar ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      </div>
                    ) : (
                      <IconCamera className="h-6 w-6 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <CardTitle className="text-2xl">{user.name || "User"}</CardTitle>
                  <CardDescription className="text-base">{user.email}</CardDescription>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {user.role || "User"}
                    </span>
                    <span>•</span>
                    <span>Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      disabled={!isEditing} 
                      className="h-10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      disabled={!isEditing} 
                      className="h-10"
                    />
                  </div>

                  {isEditing && (
                    <div className="pt-6 border-t">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">Change Password</h3>
                        <p className="text-sm text-muted-foreground">Update your account password</p>
                      </div>
                      <PasswordChangeForm 
                        onSuccess={() => {
                          // Any additional actions after password change
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t">
                  {isEditing ? (
                    <>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: user.name || "",
                            email: user.email || "",
                          });
                        }}
                        disabled={updatingProfile}
                        className="h-10"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updatingProfile}
                        className="min-w-[120px] h-10"
                      >
                        {updatingProfile ? (
                          <span className="flex items-center justify-center">
                            Saving
                          </span>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      type="button" 
                      onClick={() => setIsEditing(true)} 
                      className="flex items-center gap-2 h-10"
                    >
                      <IconEdit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}