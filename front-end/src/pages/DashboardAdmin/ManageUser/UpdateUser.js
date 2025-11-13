import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { Box, Typography, Chip } from "@mui/material";
import AdminUserService from "./AdminUserService";

export default function UpdateUser({
  user,
  open,
  onClose,
  onUpdated,
}) {
  const [username, setUsername] = React.useState(user?.username || "");
  const [role, setRole] = React.useState(user?.role || "");
  const [action, setAction] = React.useState(user?.action || "");
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    msg: "",
    severity: "success",
  });

  React.useEffect(() => {
    if (user && open) {
      setUsername(user.username || "");
      setRole(user.role || "");
      setAction(user.action || "");
    }
  }, [user, open]);

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    // Validation
    if (!username.trim()) {
      setSnackbar({
        open: true,
        msg: "Username cannot be empty",
        severity: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const reqBody = {
        username: username.trim(),
        role,
        action
      };

      const response = await AdminUserService.updateUserByAdmin(user._id, reqBody);

      if (response.success) {
        setSnackbar({
          open: true,
          msg: "User updated successfully!",
          severity: "success",
        });
        setLoading(false);
        setTimeout(() => {
          if (onUpdated) onUpdated(true);
          if (onClose) onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Update error:", error);
      setSnackbar({
        open: true,
        msg: error?.message || "Error updating user!",
        severity: "error",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 22, color: "#1976d2" }}>
          Edit User Information
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update user information. Note: Email cannot be changed.
          </DialogContentText>

          {/* Display email (readonly) */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Email (Cannot be changed)
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
              {user?.email}
            </Typography>
          </Box>

          <form onSubmit={handleUpdateUser}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              error={!username.trim() && !!username}
              helperText={!username.trim() && !!username ? "Username cannot be empty" : ""}
            />

            <TextField
              select
              label="Role"
              variant="outlined"
              fullWidth
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="buyer">Buyer</MenuItem>
              <MenuItem value="seller">Seller</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>

            <TextField
              select
              label="Status"
              variant="outlined"
              fullWidth
              value={action}
              onChange={(e) => setAction(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="unlock">
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip label="Unlocked" size="small" color="success" variant="outlined" />
                </Box>
              </MenuItem>
              <MenuItem value="lock">
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip label="Locked" size="small" color="error" variant="outlined" />
                </Box>
              </MenuItem>
            </TextField>

            <DialogActions sx={{ mt: 3, px: 0 }}>
              <Button
                onClick={onClose}
                variant="outlined"
                color="inherit"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "Updating..." : "Save"}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </>
  );
}