import toast, { Toaster } from 'react-hot-toast';

export const showToast = {
  success: (message, description = "") => {
    toast.success(message, {
      duration: 3000,
      position: "top-center",
      style: {
        background: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
      },
    });
  },

  error: (message, description = "") => {
    toast.error(message, {
      duration: 4000,
      position: "top-center",
      style: {
        background: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
      },
    });
  },

  loading: (message) => {
    return toast.loading(message, {
      position: "top-center",
      style: {
        background: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
      },
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  promise: (promise, {
    loading = "Loading...",
    success = "Success!",
    error = "Something went wrong",
  }) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
      position: "top-center",
      style: {
        background: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
      },
    });
  },
};

export { Toaster }; 