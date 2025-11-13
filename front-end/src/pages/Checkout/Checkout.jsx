import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Modal from "react-modal";
import { fetchAddresses, addAddress } from "../../features/address/addressSlice";
import { applyVoucher, clearVoucher } from "../../features/voucher/voucherSlice";
import { createOrder } from "../../features/order/orderSlice";
import { removeSelectedItems } from "../../features/cart/cartSlice";
import { createPayment } from "../../features/payment/paymentSlice";
import { motion } from "framer-motion";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  TextField,
  Divider,
  Chip,
  CircularProgress,
  FormControl,
  Checkbox
} from "@mui/material";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import DiscountIcon from '@mui/icons-material/Discount';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Custom modal styles
const customModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    position: 'relative',
    top: 'auto',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    maxWidth: '500px',
    width: '100%',
    padding: '0',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    backgroundColor: 'white',
    overflow: 'hidden'
  }
};

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from the Redux store
  const { token } = useSelector((state) => state.auth) || {};
  const cartItems = useSelector((state) => state.cart?.items || []);
  const addresses = useSelector((state) => state.address?.addresses || []);
  const { voucher, loading: voucherLoading, error: voucherError } = useSelector((state) => state.voucher);

  // State for selected products
  const selectedItems = location.state?.selectedItems || [];
  const selectedProducts = cartItems.filter(item =>
    item.productId && selectedItems.includes(item.productId._id)
  );

  // State for checkout options
  const [couponCode, setCouponCode] = useState("");
  // Demo hard-coded discount codes (client-side only)
  const DEMO_CODES = {
    'SAVE10': { discountType: 'percentage', discount: 10, minOrderValue: 0, maxDiscount: 0 },
    'FLAT50': { discountType: 'fixed', discount: 50, minOrderValue: 0 },
    'VIP100': { discountType: 'fixed', discount: 100, minOrderValue: 200 }
  };
  const [demoVoucher, setDemoVoucher] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    country: "",
    isDefault: false,
  });
  const [phoneError, setPhoneError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardDetails, setCardDetails] = useState({ cardNumber: '', exp: '', cvv: '', firstName: '', lastName: '' });
  // VietQR inline panel state
  const [showVietQrPanel, setShowVietQrPanel] = useState(false);
  const [vietQrImage, setVietQrImage] = useState(null);
  const [vietQrOrderId, setVietQrOrderId] = useState(null);
  const [vietQrPayload, setVietQrPayload] = useState(null);
  // PayOS (simulated PayPal) modal state
  const [showPayosSimulator, setShowPayosSimulator] = useState(false);
  const [payosOrderId, setPayosOrderId] = useState(null);
  const [payosAmountUSD, setPayosAmountUSD] = useState(0);
  // Exchange rate and shipping demo constants (VND per USD and per-item shipping in VND)
  const EXCHANGE_RATE = process.env.REACT_APP_VND_RATE ? Number(process.env.REACT_APP_VND_RATE) : 23500;
  const SHIPPING_PER_ITEM_VND = 9406.5;

  // Removed payment method state

  // Fetch addresses on component mount and clear voucher on unmount
  useEffect(() => {
    if (token) {
      dispatch(fetchAddresses());
    }
    return () => {
      dispatch(clearVoucher());
    };
  }, [dispatch, token]);

  // Set default address if available
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddress = addresses.find(address => address.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);
      } else {
        setSelectedAddressId(addresses[0]._id);
      }
    }
  }, [addresses]);

  // Close card modal helper
  const handleSaveCard = () => {
    // For demo: accept card and set payment method to card
    setIsCardModalOpen(false);
    // Map saved card to PayOS (online card gateway)
    setSelectedPaymentMethod('PayOS');
    toast.success('Card added (demo)');
  };

  // Small helper to generate a fake QR (SVG data URL) when backend QR not provided
  const generateFakeQrDataUrl = (orderId, amountVnd) => {
    const text = `Order:${orderId} Amount:₫${amountVnd}`;
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'>` +
      `<rect width='100%' height='100%' fill='white'/>` +
      `<g fill='black'>` +
      `<rect x='20' y='20' width='60' height='60'/>` +
      `<rect x='240' y='20' width='60' height='60'/>` +
      `<rect x='20' y='240' width='60' height='60'/>` +
      `</g>` +
      `<text x='160' y='180' font-size='12' text-anchor='middle' fill='black'>${text}</text>` +
      `</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Validate phone number
  const validatePhoneNumber = (phone) => {
    const regex = /^0\d{9}$/;
    return regex.test(phone);
  };

  // Calculate subtotal
  const subtotal = selectedProducts.reduce((total, item) => {
    return total + (item.productId?.price || 0) * item.quantity;
  }, 0);

  // Calculate discount from the applied voucher
  const calculateDiscount = () => {
    // Prefer demoVoucher (client-side) if present, otherwise fall back to server voucher
    const activeVoucher = demoVoucher || voucher;
    if (!activeVoucher) return 0;
    if (activeVoucher.minOrderValue && subtotal < activeVoucher.minOrderValue) {
      // If this is a server voucher, keep existing behavior and clear it; for demoVoucher just show error
      if (!demoVoucher && voucherError === null) {
        toast.error(`Order must have a minimum value of $${activeVoucher.minOrderValue.toLocaleString()} to apply this code.`);
        dispatch(clearVoucher());
      } else if (demoVoucher) {
        toast.error(`Order must have a minimum value of $${activeVoucher.minOrderValue.toLocaleString()} to apply this code.`);
        setDemoVoucher(null);
      }
      return 0;
    }
    if (activeVoucher.discountType === 'fixed') {
      return activeVoucher.discount;
    } else if (activeVoucher.discountType === 'percentage') {
      const calculatedDiscount = (subtotal * activeVoucher.discount) / 100;
      return activeVoucher.maxDiscount && activeVoucher.maxDiscount > 0 ? Math.min(calculatedDiscount, activeVoucher.maxDiscount) : calculatedDiscount;
    }
    return 0;
  };

  const discount = calculateDiscount();
  const total = Math.max(subtotal - discount, 0);

  // Handle adding a new address
  const handleAddAddress = () => {
    if (!validatePhoneNumber(newAddress.phone)) {
      setPhoneError("Invalid phone number. Must start with 0 and contain exactly 10 digits.");
      return;
    }
    setPhoneError("");
    dispatch(addAddress(newAddress));
    setIsAddressModalOpen(false);
    setNewAddress({
      fullName: "", phone: "", street: "", city: "", state: "", country: "", isDefault: false,
    });
  };

  // Handle applying the coupon code
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    // Client-side demo codes take precedence
    if (DEMO_CODES[code]) {
      setDemoVoucher({ ...DEMO_CODES[code], code });
      toast.success(`Demo code ${code} applied`);
      return;
    }

    // Otherwise try server-side apply
    dispatch(applyVoucher(couponCode));
  };

  // Handle canceling the applied voucher
  const handleCancelVoucher = () => {
    // Clear both server voucher and demoVoucher if present
    if (demoVoucher) setDemoVoucher(null);
    dispatch(clearVoucher());
    setCouponCode("");
    toast.info("Coupon code removed.");
  };

  // Handle placing the order, removing the paymentMethod
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }

    setIsProcessing(true);

    const orderDetails = {
      selectedItems: selectedProducts.map(item => ({
        productId: item.productId._id,
        quantity: item.quantity
      })),
      selectedAddressId,
      couponCode: voucher ? voucher.code : ''
    };

    try {
      console.log("Submitting order with items:", orderDetails.selectedItems);
      const result = await dispatch(createOrder(orderDetails)).unwrap();

      // Get all product IDs to remove from cart
      const productIds = selectedProducts.map(item => item.productId._id);

      // Remove the items from cart in a single batch operation
      await dispatch(removeSelectedItems(productIds)).unwrap();

      toast.success("Order placed successfully!");

      // Immediately create payment and skip intermediate Payment page
      try {
        const paymentResponse = await dispatch(createPayment({
          orderId: String(result.orderId),
          method: selectedPaymentMethod,
          replaceExisting: true
        })).unwrap();

        // Handle method-specific flows
        if (selectedPaymentMethod === 'PayOS') {
          if (paymentResponse && paymentResponse.paymentUrl) {
            try {
              window.open(paymentResponse.paymentUrl, '_blank');
            } catch (err) {
              console.warn('Unable to open payment URL in new tab', err);
            }
            // Navigate to payment result which will poll status
            navigate('/payment-result', { state: { orderId: String(result.orderId) }, replace: true });
          } else {
            // No external URL provided - show simulated PayPal/PayOS modal
            const amountUSD = Number(result.totalPrice || total).toFixed(2);
            setPayosOrderId(String(result.orderId));
            setPayosAmountUSD(amountUSD);
            setShowPayosSimulator(true);
            // keep isProcessing true until user completes simulation
          }
        } else if (selectedPaymentMethod === 'VietQR') {
          // Show inline VietQR panel with order info and QR (prefer backend qrData, otherwise generate a demo QR)
          const amountVnd = Math.round(result.totalPrice || total * EXCHANGE_RATE);
          const qrDataUrl = paymentResponse?.qrData?.qrDataURL || generateFakeQrDataUrl(String(result.orderId), amountVnd);
          setVietQrOrderId(String(result.orderId));
          setVietQrPayload(paymentResponse?.qrData || null);
          setVietQrImage(qrDataUrl);
          setShowVietQrPanel(true);
          // keep isProcessing true until user confirms or cancels in the modal
        } else if (selectedPaymentMethod === 'COD') {
          navigate('/payment-result', { state: { status: 'paid', orderId: String(result.orderId) }, replace: true });
        } else {
          navigate('/payment-result', { state: { orderId: String(result.orderId) }, replace: true });
        }
      } catch (payErr) {
        console.error('Payment creation failed:', payErr);
        toast.error(payErr?.message || 'Failed to create payment. Please try again.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Unexpected error occurred');
      setIsProcessing(false);
    }
  };
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: '#0F52BA',
              position: 'relative',
              pb: 2,
              mb: 4,
              '&:after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '60px',
                height: '4px',
                backgroundColor: '#0F52BA',
                borderRadius: '2px'
              }
            }}
          >
            <ShoppingCartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Checkout
          </Typography>

          <Grid container spacing={4}>
            {/* Left side: Shipping and coupon */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={3}
                sx={{ p: 4, mb: 4, borderRadius: 2, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PaymentIcon sx={{ mr: 1, color: '#0F52BA' }} />
                  <Typography variant="h5" fontWeight={600}>Pay with</Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Use backend-supported payment methods: COD, VietQR, PayOS */}
                <RadioGroup value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)}>
                  <Paper
                    variant="outlined"
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      borderColor: selectedPaymentMethod === 'COD' ? '#0F52BA' : 'divider',
                      backgroundColor: selectedPaymentMethod === 'COD' ? 'rgba(15, 82, 186, 0.04)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FormControlLabel value="COD" control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />} label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocalShippingIcon sx={{ mr: 1, color: '#0F52BA' }} />
                        <Typography>Cash on Delivery (COD)</Typography>
                      </Box>
                    } sx={{ width: '100%' }} />
                  </Paper>

                  <Paper
                    variant="outlined"
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      borderColor: selectedPaymentMethod === 'VietQR' ? '#0F52BA' : 'divider',
                      backgroundColor: selectedPaymentMethod === 'VietQR' ? 'rgba(15, 82, 186, 0.04)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FormControlLabel value="VietQR" control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />} label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PaymentIcon sx={{ mr: 1, color: '#0F52BA' }} />
                        <Typography>VietQR (QR payment)</Typography>
                      </Box>
                    } sx={{ width: '100%' }} />
                  </Paper>

                  <Paper
                    variant="outlined"
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      borderColor: selectedPaymentMethod === 'PayOS' ? '#0F52BA' : 'divider',
                      backgroundColor: selectedPaymentMethod === 'PayOS' ? 'rgba(15, 82, 186, 0.04)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FormControlLabel value="PayOS" control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />} label={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body1">Pay by card / online (PayOS)</Typography>
                        </Box>
                        <Button size="small" variant="outlined" onClick={() => setIsCardModalOpen(true)} sx={{ textTransform: 'none' }}>Add card</Button>
                      </Box>
                    } sx={{ width: '100%' }} />
                  </Paper>
                </RadioGroup>
              </Paper>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  mb: 4,
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocalShippingIcon sx={{ mr: 1, color: '#0F52BA' }} />
                  <Typography variant="h5" fontWeight={600}>
                    Shipping Address
                  </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {addresses.length > 0 ? (
                  <RadioGroup
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                  >
                    <Grid container spacing={2}>
                      {addresses.map((address) => (
                        <Grid item xs={12} sm={6} key={address._id}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              borderColor: selectedAddressId === address._id ? '#0F52BA' : 'divider',
                              backgroundColor: selectedAddressId === address._id ? 'rgba(15, 82, 186, 0.04)' : 'transparent',
                              position: 'relative',
                              transition: 'all 0.2s'
                            }}
                          >
                            {address.isDefault && (
                              <Chip
                                label="Default"
                                size="small"
                                color="primary"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: '#0F52BA'
                                }}
                              />
                            )}
                            <FormControlLabel
                              value={address._id}
                              control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />}
                              label={
                                <Box sx={{ ml: 1 }}>
                                  <Typography variant="body1" fontWeight={600}>
                                    {address.fullName}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {address.phone}
                                  </Typography>
                                  <Typography variant="body2">
                                    {`${address.street}, ${address.city}, ${address.state}, ${address.country}`}
                                  </Typography>
                                </Box>
                              }
                              sx={{ width: '100%', alignItems: 'flex-start', m: 0 }}
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </RadioGroup>
                ) : (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    You don't have any addresses yet. Please add a new address.
                  </Typography>
                )}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddressModalOpen(true)}
                  sx={{
                    mt: 3,
                    borderColor: '#0F52BA',
                    color: '#0F52BA',
                    '&:hover': {
                      borderColor: '#0A3C8A',
                      backgroundColor: 'rgba(15, 82, 186, 0.04)',
                    }
                  }}
                >
                  Add New Address
                </Button>
              </Paper>

              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <DiscountIcon sx={{ mr: 1, color: '#0F52BA' }} />
                  <Typography variant="h5" fontWeight={600}>
                    Discount Code
                  </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {voucher ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                      <Typography variant="body1" fontWeight={500} color="success.main">
                        Applied: {voucher.code}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CloseIcon />}
                      onClick={handleCancelVoucher}
                      sx={{ minWidth: 100 }}
                    >
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex' }}>
                    <TextField
                      fullWidth
                      placeholder="Enter discount code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleApplyCoupon}
                      disabled={voucherLoading || !couponCode.trim()}
                      sx={{
                        minWidth: 100,
                        backgroundColor: '#0F52BA',
                        '&:hover': {
                          backgroundColor: '#0A3C8A',
                        }
                      }}
                    >
                      {voucherLoading ? <CircularProgress size={24} color="inherit" /> : 'Apply'}
                    </Button>
                  </Box>
                )}

                {voucherError && !voucher && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {voucherError}
                  </Typography>
                )}
              </Paper>

              <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 2, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <Typography variant="h5" fontWeight={600} mb={2}>Gift cards and coupons</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Apply coupons or add eBay gift cards to your account. Once added, gift cards can't be removed.</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField placeholder="Enter code:" size="small" sx={{ flex: 1 }} />
                  <Button variant="contained" sx={{ borderRadius: 99, backgroundColor: '#e0e0e0', color: '#444', '&:hover': { backgroundColor: '#d5d5d5' } }}>Apply</Button>
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 0, mt: 4 }}>
                <Typography variant="h5" fontWeight={600} mb={2}>Donate to charity</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>You can help build & donate specially adapted custom homes nationwide for severely injured post-9/11 Veterans. Select amount:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography>Select amount</Typography>
                  <Box component="select" style={{ padding: '10px', borderRadius: 8 }}>
                    <option>None</option>
                    <option>$1</option>
                    <option>$5</option>
                    <option>$10</option>
                  </Box>
                </Box>
              </Paper>


              {/* Removed Payment Method section */}
            </Grid>

            {/* Right side: Order summary */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  borderRadius: 2,
                  position: 'sticky',
                  top: 24,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                }}
              >
                <Typography variant="h5" fontWeight={600} mb={3}>
                  Order Summary
                </Typography>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 3, pr: 1 }}>
                  {selectedProducts.map(item => {
                    const itemTotalUSD = (item.productId?.price || 0) * item.quantity;
                    const itemTotalVND = Math.round(itemTotalUSD * EXCHANGE_RATE);
                    return (
                      <Box
                        key={item.productId?._id}
                        sx={{
                          display: 'flex',
                          mb: 2,
                          pb: 2,
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        <Box
                          sx={{
                            width: 70,
                            height: 70,
                            flexShrink: 0,
                            backgroundColor: '#f5f5f5',
                            borderRadius: 1,
                            overflow: 'hidden',
                            mr: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <img
                            src={item.productId?.image}
                            alt={item.productId?.title}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500} noWrap>
                            {item.productId?.title || item.productId?.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Quantity: {item.quantity}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(itemTotalVND)} VND</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', ml: 2 }}>
                          <Typography variant="body1" fontWeight={600}>
                            ${itemTotalUSD.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">({new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(itemTotalVND)} VND)</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ mb: 3 }}>
                  {(() => {
                    const itemsCount = selectedProducts.length;
                    const subtotalVND = Math.round(subtotal * EXCHANGE_RATE);
                    const discountVND = Math.round(discount * EXCHANGE_RATE);
                    const shippingFeeVND = Math.round(itemsCount * SHIPPING_PER_ITEM_VND);
                    const totalVND = subtotalVND - discountVND + shippingFeeVND;
                    const formatVND = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

                    return (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1">Items ({itemsCount})</Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body1">US ${subtotal.toFixed(2)}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatVND(subtotalVND)} VND</Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2">Shipping to 440000</Typography>
                            <Typography variant="caption" color="text.secondary">Delivery estimate & fees</Typography>
                          </Box>
                          <Typography variant="body1">{formatVND(shippingFeeVND)} VND</Typography>
                        </Box>

                        {discount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                            <Typography variant="body1">Discount:</Typography>
                            <Typography variant="body1">-{formatVND(discountVND)} VND</Typography>
                          </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                          <Typography variant="h6" fontWeight={600}>Subtotal</Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.25rem' }}>₫{formatVND(totalVND)}</Typography>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || selectedProducts.length === 0 || !selectedPaymentMethod || showVietQrPanel || showPayosSimulator}
                  sx={{
                    py: 1.5,
                    backgroundColor: '#0F52BA',
                    '&:hover': {
                      backgroundColor: '#0A3C8A',
                    },
                    fontWeight: 600
                  }}
                >
                  {isProcessing ? (
                    <>
                      <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                      Processing...
                    </>
                  ) : (
                    'Confirm and pay'
                  )}
                </Button>
                {!selectedPaymentMethod && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Select a payment method
                  </Typography>
                )}

                <Box sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: 'rgba(15, 82, 186, 0.04)',
                  borderRadius: 2,
                  border: '1px dashed #0F52BA'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    By placing your order, you agree to our terms and conditions.
                    For Cash on Delivery orders, please have the exact amount ready at the time of delivery.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </motion.div>
        {/* VietQR inline panel: shows order info and fake/returned QR for buyer to scan */}
        {showVietQrPanel && (
          <Modal
            isOpen={showVietQrPanel}
            onRequestClose={() => { setShowVietQrPanel(false); setIsProcessing(false); }}
            style={customModalStyles}
            contentLabel="VietQR Payment"
            ariaHideApp={false}
          >
            <Box sx={{ p: 4, maxWidth: 720 }}>
              <Typography variant="h5" fontWeight={700} mb={2}>Scan to pay</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Order: {vietQrOrderId}</Typography>
              <Paper sx={{ p: 3, mb: 2, textAlign: 'center' }}>
                {vietQrImage ? (
                  <img src={vietQrImage} alt="VietQR" style={{ width: 280, height: 280, objectFit: 'contain' }} />
                ) : (
                  <Box sx={{ width: 280, height: 280, backgroundColor: '#f5f5f5', display: 'inline-block' }} />
                )}
              </Paper>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => { setShowVietQrPanel(false); setIsProcessing(false); toast.info('VietQR canceled'); }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={() => {
                  // Simulate scan+paid: navigate to payment result with paid status
                  setShowVietQrPanel(false);
                  setIsProcessing(false);
                  toast.success('Payment confirmed (demo)');
                  navigate('/payment-result', { state: { status: 'paid', orderId: vietQrOrderId }, replace: true });
                }} sx={{ backgroundColor: '#0F52BA', '&:hover': { backgroundColor: '#0A3C8A' } }}>
                  OK
                </Button>
              </Box>
            </Box>
          </Modal>
        )}

        {/* PayOS simulator modal (simple PayPal-style mock) */}
        {showPayosSimulator && (
          <Modal
            isOpen={showPayosSimulator}
            onRequestClose={() => { setShowPayosSimulator(false); setIsProcessing(false); }}
            style={customModalStyles}
            contentLabel="PayOS Simulator"
            ariaHideApp={false}
          >
            <Box sx={{ p: 4, maxWidth: 720 }}>
              <Typography variant="h5" fontWeight={700} mb={2}>Pay with PayPal (demo)</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>Order: {payosOrderId}</Typography>
              <Typography variant="h6" fontWeight={600} mb={3}>Amount: ${Number(payosAmountUSD).toFixed(2)}</Typography>

              <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="body2">This is a simulated PayPal/PayOS checkout for demo purposes. Click Pay to simulate a successful payment.</Typography>
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => { setShowPayosSimulator(false); setIsProcessing(false); toast.info('Payment cancelled'); }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={() => {
                  // Simulate successful PayPal payment
                  setShowPayosSimulator(false);
                  setIsProcessing(false);
                  toast.success('Payment successful (demo)');
                  navigate('/payment-result', { state: { status: 'paid', orderId: payosOrderId }, replace: true });
                }} sx={{ backgroundColor: '#0F52BA', '&:hover': { backgroundColor: '#0A3C8A' } }}>
                  Pay ${Number(payosAmountUSD).toFixed(2)}
                </Button>
              </Box>
            </Box>
          </Modal>
        )}

        {/* Add new address modal */}
        <Modal
          isOpen={isAddressModalOpen}
          onRequestClose={() => setIsAddressModalOpen(false)}
          style={customModalStyles}
          contentLabel="Add New Address"
          ariaHideApp={false}
        >
          <Box sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={600} mb={3}>
              Add New Address
            </Typography>

            {phoneError && (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {phoneError}
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={newAddress.fullName}
                  onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State/Province"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Country"
                  value={newAddress.country}
                  onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                      sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }}
                    />
                  }
                  label="Set as default address"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setIsAddressModalOpen(false)}
                sx={{
                  borderColor: 'grey.500',
                  color: 'grey.700',
                  '&:hover': {
                    borderColor: 'grey.700',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAddAddress}
                sx={{
                  backgroundColor: '#0F52BA',
                  '&:hover': {
                    backgroundColor: '#0A3C8A',
                  }
                }}
              >
                Save Address
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Add card modal (demo) */}
        <Modal
          isOpen={isCardModalOpen}
          onRequestClose={() => setIsCardModalOpen(false)}
          style={customModalStyles}
          contentLabel="Add Card"
          ariaHideApp={false}
        >
          <Box sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={600} mb={2}>Credit or debit card</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Your payment is secure. Your card details will not be shared with sellers.</Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Card number" value={cardDetails.cardNumber} onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })} size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Expiration date" value={cardDetails.exp} onChange={(e) => setCardDetails({ ...cardDetails, exp: e.target.value })} size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Security code" value={cardDetails.cvv} onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })} size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="First name" value={cardDetails.firstName} onChange={(e) => setCardDetails({ ...cardDetails, firstName: e.target.value })} size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last name" value={cardDetails.lastName} onChange={(e) => setCardDetails({ ...cardDetails, lastName: e.target.value })} size="small" />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => setIsCardModalOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveCard}>Done</Button>
            </Box>
          </Box>
        </Modal>
      </Container>
    );
  };

  export default Checkout;