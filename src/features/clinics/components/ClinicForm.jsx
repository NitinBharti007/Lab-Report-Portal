import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { IconUpload, IconX } from "@tabler/icons-react";
import { toast } from "react-hot-toast";

const clinicFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  region: z.string().min(1, "Please select a region"),
  email: z.string().email("Invalid email address"),
  logo_url: z.string().optional().nullable(),
});

const REGION_OPTIONS = ["North", "South", "East", "West"];

export default function ClinicForm({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  mode = "add",
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadError, setUploadError] = useState("");

  const defaultValues = {
    name: "",
    address: "",
    region: "",
    email: "",
    logo_url: "",
    contact_ids: [],
    report_ids: [],
  };

  const form = useForm({
    resolver: zodResolver(clinicFormSchema),
    defaultValues: initialData || defaultValues,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      const data = initialData || defaultValues;
      form.reset(data);
      if (data.logo_url) {
        setPreviewUrl(data.logo_url);
      } else {
        setPreviewUrl("");
      }
      setSelectedFile(null);
      setUploadError("");
    }
  }, [isOpen, initialData]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image size should be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setUploadError("");
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    form.setValue("logo_url", "");
  };

  const uploadImage = async (file) => {
    try {
      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Authentication error");
      }
      if (!session) {
        throw new Error("No active session");
      }

      // Generate a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName;

      console.log("Uploading file:", {
        fileName,
        filePath,
        fileType: file.type,
        fileSize: file.size,
      });

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("clinic-logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        if (uploadError.message.includes("duplicate")) {
          throw new Error("A file with this name already exists");
        }
        throw new Error("Failed to upload image");
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("clinic-logos").getPublicUrl(filePath);

      console.log("Generated public URL:", publicUrl);

      // Update the preview URL
      setPreviewUrl(publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("Error in uploadImage:", error);
      toast.error(error.message || "Failed to upload image");
      throw error;
    }
  };

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setUploadError("");

      // If there's a new file selected, upload it
      if (selectedFile) {
        try {
          const imageUrl = await uploadImage(selectedFile);
          data.logo_url = imageUrl;
          // Update the form value
          form.setValue("logo_url", imageUrl);
        } catch (uploadError) {
          setUploadError(uploadError.message);
          setIsSubmitting(false);
          return; // Stop form submission if upload fails
        }
      }

      // Ensure logo_url is included in the form data
      const formData = {
        ...data,
        logo_url: data.logo_url || form.getValues("logo_url"),
      };

      console.log("Submitting form data:", formData);
      await onSubmit(formData);

      // Reset form and state
      form.reset();
      setPreviewUrl("");
      setSelectedFile(null);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Form submission error:", error);
      setUploadError(
        error.message || "Failed to save clinic. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setPreviewUrl("");
    setSelectedFile(null);
    setUploadError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {mode === "add" ? "Add New Clinic" : "Edit Clinic"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {mode === "add"
              ? "Enter the details of the new clinic."
              : "Update the clinic details."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter clinic name"
                      {...field}
                      className={
                        form.formState.errors.name
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Address<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter clinic address"
                      {...field}
                      className={
                        form.formState.errors.address
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Region<span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={
                          form.formState.errors.region
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REGION_OPTIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter clinic email"
                      {...field}
                      className={
                        form.formState.errors.email
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Logo</FormLabel>
                  <div className="space-y-4">
                    {previewUrl && (
                      <div className="relative w-32 h-32">
                        <img
                          src={previewUrl}
                          alt="Clinic logo preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <Label
                        htmlFor="logo-upload"
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent"
                      >
                        <IconUpload className="h-4 w-4" />
                        <span>Upload Logo</span>
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                    {uploadError && (
                      <p className="text-sm text-red-500">{uploadError}</p>
                    )}
                  </div>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === "add"
                    ? "Adding..."
                    : "Saving..."
                  : mode === "add"
                  ? "Add Clinic"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
