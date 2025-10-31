import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  InputAdornment,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PercentIcon from '@mui/icons-material/Percent';

const VoucherForm = ({ open, onClose, onSubmit, voucher = null, isEdit = false }) => {
  const initialState = {
    code: '',
    discount: '',
    minOrderValue: '',
    usageLimit: '',
    maxDiscount: '',
    expirationDate: '',
    isActive: true
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (voucher && isEdit) {
      setFormData({
        code: voucher.code || '',
        discount: voucher.discount || '',
        minOrderValue: voucher.minOrderValue || '',
        usageLimit: voucher.usageLimit || '',
        maxDiscount: voucher.maxDiscount || '',
        expirationDate: voucher.expirationDate ? formatDateForInput(new Date(voucher.expirationDate)) : '',
        isActive: voucher.isActive !== undefined ? voucher.isActive : true
      });
    } else {
      setFormData(initialState);
    }
  }, [voucher, isEdit]);

  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) 
      month = '0' + month;
    if (day.length < 2) 
      day = '0' + day;

    return [year, month, day].join('-');
  };

  const validateForm = () => {
    let tempErrors = {};
    let formIsValid = true;

    if (!formData.code || formData.code.trim() === '') {
      tempErrors.code = "Voucher code cannot be empty";
      formIsValid = false;
    } else if (formData.code.length < 3) {
      tempErrors.code = "Voucher code must be at least 3 characters";
      formIsValid = false;
    }

    if (!formData.discount || formData.discount === '') {
      tempErrors.discount = "Discount value cannot be empty";
      formIsValid = false;
    } else if (isNaN(formData.discount) || formData.discount <= 0) {
      tempErrors.discount = "Discount must be a positive number";
      formIsValid = false;
    }

    if (!formData.minOrderValue || formData.minOrderValue === '') {
      tempErrors.minOrderValue = "Minimum order value cannot be empty";
      formIsValid = false;
    } else if (isNaN(formData.minOrderValue) || formData.minOrderValue <= 0) {
      tempErrors.minOrderValue = "Minimum order value must be a positive number";
      formIsValid = false;
    }

    if (!formData.usageLimit || formData.usageLimit === '') {
      tempErrors.usageLimit = "Usage limit cannot be empty";
      formIsValid = false;
    } else if (isNaN(formData.usageLimit) || formData.usageLimit <= 0 || !Number.isInteger(Number(formData.usageLimit))) {
      tempErrors.usageLimit = "Usage limit must be a positive integer";
      formIsValid = false;
    }

    if (formData.maxDiscount && (isNaN(formData.maxDiscount) || formData.maxDiscount <= 0)) {
      tempErrors.maxDiscount = "Maximum discount must be a positive number";
      formIsValid = false;
    }

    if (!formData.expirationDate) {
      tempErrors.expirationDate = "Expiration date cannot be empty";
      formIsValid = false;
    } else {
      const now = new Date();
      const selected = new Date(formData.expirationDate);
      now.setHours(0, 0, 0, 0);
      if (selected < now) {
        tempErrors.expirationDate = "Expiration date must be greater than or equal to today";
        formIsValid = false;
      }
    }

    setErrors(tempErrors);
    return formIsValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSwitchChange = (e) => {
    setFormData({
      ...formData,
      isActive: e.target.checked
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Format data before submitting
      const submitData = {
        ...formData,
        discount: Number(formData.discount),
        minOrderValue: Number(formData.minOrderValue),
        usageLimit: Number(formData.usageLimit),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        expirationDate: formData.expirationDate,
      };
      onSubmit(submitData);
    }
  };

  const handleCancel = () => {
    setFormData(initialState);
    setErrors({});
    onClose();
  };

  // Get minimum date (today)
  const getTodayFormatted = () => {
    return formatDateForInput(new Date());
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'primary.main',
        color: 'white'
      }}>
        {isEdit ? 'Edit Voucher' : 'Add New Voucher'}
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleCancel}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate sx={{ mt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Voucher Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              margin="normal"
              error={!!errors.code}
              helperText={errors.code}
              disabled={isEdit} // Cannot edit code when updating
              InputProps={{
                sx: { textTransform: 'uppercase' }
              }}
            />

            <TextField
              label="Discount (%)"
              name="discount"
              type="number"
              value={formData.discount}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              margin="normal"
              error={!!errors.discount}
              helperText={errors.discount}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon /></InputAdornment>,
              }}
            />

            <TextField
              label="Minimum Order Value ($)"
              name="minOrderValue"
              type="number"
              value={formData.minOrderValue}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              margin="normal"
              error={!!errors.minOrderValue}
              helperText={errors.minOrderValue}
              InputProps={{
                endAdornment: <InputAdornment position="end">$</InputAdornment>,
              }}
            />

            <TextField
              label="Maximum Usage Limit"
              name="usageLimit"
              type="number"
              value={formData.usageLimit}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              margin="normal"
              error={!!errors.usageLimit}
              helperText={errors.usageLimit}
            />

            <TextField
              label="Maximum Discount ($)"
              name="maxDiscount"
              type="number"
              value={formData.maxDiscount}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              margin="normal"
              error={!!errors.maxDiscount}
              helperText={errors.maxDiscount || "Optional"}
              InputProps={{
                endAdornment: <InputAdornment position="end">$</InputAdornment>,
              }}
            />

            <TextField
              label="Expiration Date"
              name="expirationDate"
              type="date"
              value={formData.expirationDate}
              onChange={handleChange}
              InputLabelProps={{ 
                shrink: true,
              }}
              inputProps={{
                min: getTodayFormatted()
              }}
              fullWidth
              margin="normal"
              error={!!errors.expirationDate}
              helperText={errors.expirationDate}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleSwitchChange}
                  color="primary"
                />
              }
              label={
                <Typography color={formData.isActive ? "success.main" : "text.secondary"}>
                  {formData.isActive ? "Voucher is active" : "Voucher is inactive"}
                </Typography>
              }
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isEdit ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VoucherForm; 