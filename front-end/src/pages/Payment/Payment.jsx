// Payment.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { createPayment, resetPayment, checkPaymentStatus, cancelPaymentPolling } from "../../features/payment/paymentSlice";
import axios from "axios";
import { motion } from "framer-motion";
import { 
  Box, 
  Container, 
  Typography, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  Button, 
  Paper, 
  Divider, 
  CircularProgress,
  Grid
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const payosIframeRef = useRef(null);

  // Ensure orderId is a string and handle null/undefined cases safely
  const locationState = location.state || {};
  const orderId = locationState.orderId ? String(locationState.orderId) : null;
  const totalPrice = locationState.totalPrice || 0;
  const preferredMethod = locationState.preferredMethod || 'PayOS'; // Default to PayOS if not specified
  const comingFromOrderPage = Boolean(locationState.directPayment); // Flag to check if coming from order pages

  // Đảm bảo totalPrice là số nguyên cho các API thanh toán
  const formattedPrice = Number(totalPrice).toFixed(2);
  const roundedPrice = Math.round(totalPrice);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(preferredMethod);
  const [showPayosIframe, setShowPayosIframe] = useState(false);
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);
  const MAX_POLLING_RETRIES = 10; // Maximum number of retries

  const { payment, paymentStatus, loading, error, success } = useSelector((state) => state.payment);
  const { token } = useSelector((state) => state.auth);

  // Auto-process payment if coming from order history/detail pages with PayOS method
  useEffect(() => {
    if (orderId && locationState.directPayment && selectedPaymentMethod === 'PayOS') {
      handlePayment();
    }
  }, []);

  // Hàm kiểm tra trạng thái thanh toán
  const checkPaymentStatusHandler = async () => {
    try {
      // Check if we've already registered this payment as completed
      const paymentCompleted = sessionStorage.getItem(`payment_${orderId}_completed`);
      if (paymentCompleted === 'true') {
        console.log(`Payment ${orderId} was already completed, forcefully stopping polling`);
        clearPolling();
        navigate('/', { replace: true });
        return true;
      }

      // Increment polling counter
      setPollingCount(prev => prev + 1);
      
      console.log(`Checking payment status for order: ${orderId} (attempt ${pollingCount + 1}/${MAX_POLLING_RETRIES})`);
      
      // Stop if we've reached max retries
      if (pollingCount >= MAX_POLLING_RETRIES) {
        console.log(`Reached max polling retries (${MAX_POLLING_RETRIES}), stopping polling`);
        clearPolling();
        
        // If we've hit max retries, go to payment result page anyway
        navigate('/payment-result', { 
          state: { orderId: orderId },
          replace: true 
        });
        return false;
      }
      
      // Dispatch action kiểm tra trạng thái
      const resultAction = await dispatch(checkPaymentStatus(orderId));
      if (checkPaymentStatus.fulfilled.match(resultAction)) {
        const data = resultAction.payload;
        const paymentStatus = data?.payment?.status;
        
        console.log('Payment status check result:', paymentStatus);
        
        // Stop polling if payment is marked as paid - chỉ cần payment is "paid" là dừng callback
        if (paymentStatus === 'paid') {
          console.log('Payment is paid, forcefully stopping all polling');
          
          // Add a flag to sessionStorage to prevent future polling
          sessionStorage.setItem(`payment_${orderId}_completed`, 'true');
          
          // Force clear all polling before any UI updates or navigation
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          // Set state to stop polling
          setPollingInterval(null);
          setPaymentPolling(false);
          
          // Clear from Redux state
          dispatch(cancelPaymentPolling());
          
          // Show success message
          toast.success("Thanh toán thành công!");
          
          // Navigate directly to home page instead of payment result
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
          
          return true;
        } 
        // Stop polling if payment failed
        else if (paymentStatus === 'failed') {
          console.log('Payment failed, forcefully stopping all polling');
          
          // Force clear all polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          // Set state to stop polling
          setPollingInterval(null);
          setPaymentPolling(false);
          
          // Clear from Redux state
          dispatch(cancelPaymentPolling());
          
          toast.error("Thanh toán thất bại!");
          
          // Navigate to payment result page
          navigate('/payment-result', { 
            state: { status: 'failed', orderId: orderId },
            replace: true 
          });
          return false;
        }
      } else {
        console.error('Failed to check payment status:', resultAction.error);
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra trạng thái thanh toán:", err);
    }
    return false;
  };

  // Hàm xóa interval polling
  const clearPolling = () => {
    console.log('Clearing polling interval');
    
    // Cancel any outstanding requests
    const controller = new AbortController();
    controller.abort();
    
    // Clear the interval if it exists
    if (pollingInterval) {
      console.log('Clearing polling interval ID:', pollingInterval);
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Reset state
    setPaymentPolling(false);
    
    // Clear in Redux
    dispatch(cancelPaymentPolling());
    
    // If there's an orderId and the payment was successful, mark it as completed
    if (orderId) {
      const paymentCompleted = sessionStorage.getItem(`payment_${orderId}_completed`);
      if (paymentCompleted === 'true') {
        console.log(`Payment ${orderId} already marked as completed`);
      } else if (payment?.status === 'paid') {
      console.log(`Marking payment ${orderId} as completed`);
      sessionStorage.setItem(`payment_${orderId}_completed`, 'true');
      }
    }
  };

  // Khởi tạo polling
  const startPaymentPolling = () => {
    // Xóa polling cũ nếu có
    clearPolling();
    
    // Check if payment was already completed to avoid starting polling
    const paymentCompleted = sessionStorage.getItem(`payment_${orderId}_completed`);
    if (paymentCompleted === 'true') {
      console.log(`Payment ${orderId} was already completed, not starting polling`);
      // Navigate directly to home
      navigate('/', { replace: true });
      return;
    }
    
    // Reset polling count
    setPollingCount(0);
    
    // Tạo polling mới
    console.log('Starting payment status polling');
    setPaymentPolling(true);
    
    // Kiểm tra ngay lần đầu
    checkPaymentStatusHandler();
    
    const interval = setInterval(() => {
      checkPaymentStatusHandler();
    }, 5000); // Check every 5 seconds
    
    console.log('Setting polling interval ID:', interval);
    setPollingInterval(interval);
    
    // Tự động dừng polling sau 3 phút để tránh vòng lặp vô hạn
    setTimeout(() => {
      if (pollingInterval) {
        console.log('Auto stopping polling after timeout');
        clearPolling();
        // Navigate back to order history
        navigate('/order-history', { replace: true });
      }
    }, 3 * 60 * 1000); // Reduced from 5 to 3 minutes
  };
  
  // Xóa polling khi component unmount
  useEffect(() => {
    return () => {
      console.log('Payment component unmounting, clearing polling');
      clearPolling();
    };
  }, []);

  // Thêm tuyến bảo vệ để đảm bảo dừng polling khi trang thay đổi
  useEffect(() => {
    const handleRouteChange = () => {
      console.log('Route change detected, clearing polling');
      // Force clear all polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
        setPaymentPolling(false);
      }
      // Dispatch to Redux
      dispatch(cancelPaymentPolling());
    };

    // Lắng nghe sự kiện trước khi navigate
    window.addEventListener('beforeunload', handleRouteChange);
    
    // Capture navigation events
    const unlisten = navigate.listen && navigate.listen(() => {
      console.log('Navigation detected, clearing polling');
      handleRouteChange();
    });
    
    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
      if (unlisten) unlisten();
      
      // Force clear polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
        setPaymentPolling(false);
      }
      
      dispatch(cancelPaymentPolling());
    };
  }, [pollingInterval, dispatch]);

  // Polling for payment status - add check for completed payments
  useEffect(() => {
    // Check if payment was already completed
    const paymentCompleted = sessionStorage.getItem(`payment_${orderId}_completed`);
    if (paymentCompleted === 'true') {
      console.log(`Payment ${orderId} was already completed, skipping polling`);
      return;
    }
    
    if (success && selectedPaymentMethod === 'PayOS') {
      if (payment?.paymentUrl) {
        startPaymentPolling();
      }
    }
    
    // Đảm bảo dừng polling khi rời khỏi component
    return () => clearPolling();
  }, [success, selectedPaymentMethod, payment]);

  useEffect(() => {
    if (success) {
      if (selectedPaymentMethod === 'PayOS') {
        if (payment?.paymentUrl) {
          setShowPayosIframe(true);
          toast.success("Cổng thanh toán PayOS đã mở");
        } else {
          console.error("Phản hồi PayOS thiếu URL thanh toán:", payment);
          toast.error("Không thể tạo liên kết thanh toán PayOS");
          dispatch(resetPayment());
        }
      } else if (selectedPaymentMethod === 'COD') {
        toast.success("Đã tạo đơn hàng thanh toán khi nhận hàng thành công.");
        // Clear any polling before navigating
        clearPolling();
        setTimeout(() => {
          navigate('/payment-result', { 
            state: { status: 'paid', orderId: orderId },
            replace: true 
          });
        }, 2000);
      }
    }

    if (error) {
      toast.error(error);
      dispatch(resetPayment());
    }
  }, [success, error, payment, selectedPaymentMethod, dispatch, orderId, navigate]);

  if (!orderId) {
    console.error("Missing orderId in location state:", locationState);
    toast.error("Order information not found.");
    navigate("/");
    return null;
  }

  // Handle PayOS iframe loading error
  const handlePayOsIframeError = () => {
    console.error("Error loading PayOS payment iframe");
    toast.error("Payment gateway failed to load. Please try another payment method.");
    setShowPayosIframe(false);
    dispatch(resetPayment());
  };

  const handlePayment = () => {
    if (!orderId) {
      toast.error("Order information not found.");
      navigate("/");
      return;
    }

    if (selectedPaymentMethod === 'PayOS') {
      toast.info("Opening payment gateway...");
    }
    
    // Ensure orderId is passed as a string
    dispatch(createPayment({ 
      orderId: String(orderId), 
      method: selectedPaymentMethod,
      replaceExisting: comingFromOrderPage // Delete previous payment records if coming from order history/detail
    }));
  };

  // Xử lý khi đóng cổng thanh toán
  const handleBackToHome = () => {
    setShowPayosIframe(false);
    clearPolling();
    dispatch(resetPayment());
    navigate("/");
  };

  // Open PayOS payment page in new tab
  const openPaymentPage = () => {
    if (payment?.paymentUrl) {
      window.open(payment.paymentUrl, '_blank');
    }
  };

  // If coming from order history or order detail, show only PayOS option
  const renderPaymentMethods = () => {
    // If coming from order page, only show PayOS option
    if (comingFromOrderPage) {
      return (
        <Paper 
          variant="outlined" 
          sx={{ 
            mb: 2, 
            p: 2, 
            borderRadius: 2,
            borderColor: '#0F52BA',
            backgroundColor: 'rgba(15, 82, 186, 0.04)',
            transition: 'all 0.2s'
          }}
        >
          <FormControlLabel 
            value="PayOS" 
            control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PaymentIcon sx={{ mr: 1, color: '#0F52BA' }} />
                <Typography>PayOS</Typography>
              </Box>
            }
            sx={{ width: '100%' }}
            checked={true}
            disabled={true} // Cannot be changed
          />
        </Paper>
      );
    }
    
    // Otherwise show all payment options
    return (
      <RadioGroup
        value={selectedPaymentMethod}
        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
      >
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
          <FormControlLabel 
            value="COD" 
            control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalAtmIcon sx={{ mr: 1, color: '#0F52BA' }} />
                <Typography>Cash on Delivery (COD)</Typography>
              </Box>
            }
            sx={{ width: '100%' }}
          />
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
          <FormControlLabel 
            value="PayOS" 
            control={<Radio sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }} />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PaymentIcon sx={{ mr: 1, color: '#0F52BA' }} />
                <Typography>PayOS</Typography>
              </Box>
            }
            sx={{ width: '100%' }}
          />
        </Paper>
      </RadioGroup>
    );
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
          <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          {comingFromOrderPage ? 'Payment Method: PayOS' : 'Select Payment Method'}
        </Typography>
        
        {showPayosIframe && payment?.paymentUrl ? (
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 2,
              maxWidth: 800,
              mx: 'auto',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            <Typography variant="h5" fontWeight={600} mb={3}>
              PayOS Payment
            </Typography>
            <Box 
              sx={{ 
                height: "600px", 
                border: '1px solid #eaeaea',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 3
              }}
            >
              <iframe 
                ref={payosIframeRef}
                src={payment.paymentUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none"
                }}
                title="PayOS Payment"
                allow="payment"
                onError={handlePayOsIframeError}
              />
            </Box>
            <Grid container spacing={2} justifyContent="space-between">
              <Grid item>
                <Button
                  variant="contained"
                  onClick={openPaymentPage}
                  startIcon={<PaymentIcon />}
                  sx={{ 
                    backgroundColor: '#0F52BA',
                    '&:hover': {
                      backgroundColor: '#0A3C8A',
                    },
                    px: 3,
                    py: 1
                  }}
                >
                  Open in new tab
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={handleBackToHome}
                  startIcon={<HomeIcon />}
                  sx={{ 
                    borderColor: '#0F52BA',
                    color: '#0F52BA',
                    '&:hover': {
                      borderColor: '#0A3C8A',
                      backgroundColor: 'rgba(15, 82, 186, 0.04)',
                    },
                    px: 3,
                    py: 1
                  }}
                >
                  Return to home
                </Button>
              </Grid>
            </Grid>
          </Paper>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 4, 
                  borderRadius: 2,
                  height: '100%',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}
              >
                <Typography variant="h5" fontWeight={600} mb={3}>
                  {comingFromOrderPage ? 'Payment Method' : 'Choose Payment Method'}
                </Typography>
                
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  {renderPaymentMethods()}
                </FormControl>
                
                {!success && (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handlePayment}
                    disabled={loading}
                    sx={{ 
                      mt: 3, 
                      py: 1.5,
                      backgroundColor: '#0F52BA',
                      '&:hover': {
                        backgroundColor: '#0A3C8A',
                      },
                      fontWeight: 600
                    }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                        Processing...
                      </>
                    ) : (
                      'Proceed to Payment'
                    )}
                  </Button>
                )}
                
                {success && (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    onClick={handleBackToHome}
                    startIcon={<HomeIcon />}
                    sx={{ 
                      mt: 3,
                      py: 1.5,
                      borderColor: '#0F52BA',
                      color: '#0F52BA',
                      '&:hover': {
                        borderColor: '#0A3C8A',
                        backgroundColor: 'rgba(15, 82, 186, 0.04)',
                      },
                      fontWeight: 600
                    }}
                  >
                    Return to Home
                  </Button>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 4, 
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}
              >
                <Typography variant="h5" fontWeight={600} mb={3}>
                  Order Summary
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body1" color="text.secondary">Order ID:</Typography>
                    <Typography variant="body1" fontWeight={500}>{orderId}</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6" fontWeight={700} color="#0F52BA">
                      ${formattedPrice}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(15, 82, 186, 0.04)', 
                  borderRadius: 2,
                  border: '1px dashed #0F52BA'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    By proceeding with this payment, you agree to our terms and conditions. 
                    {!comingFromOrderPage && ' For Cash on Delivery orders, please have the exact amount ready at the time of delivery.'}
                  </Typography>
                </Box>
              </Paper>
              
              <Button
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
                sx={{ 
                  mt: 2,
                  color: '#0F52BA',
                  '&:hover': {
                    backgroundColor: 'rgba(15, 82, 186, 0.04)',
                  }
                }}
              >
                Back to Checkout
              </Button>
            </Grid>
          </Grid>
        )}
      </motion.div>
    </Container>
  );
};

export default Payment;