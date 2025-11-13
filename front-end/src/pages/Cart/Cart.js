import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { 
  fetchCart,
  updateCartItem,
  removeCartItem,
  resetCart,
  removeSelectedItems
} from "../../features/cart/cartSlice";
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Button, 
  Divider, 
  Checkbox,
  CircularProgress,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  Alert,
  Fade
} from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { token } = useSelector((state) => state.auth) || {};
  const { items: cartItems, loading, error } = useSelector((state) => state.cart);
  
  const [totalAmt, setTotalAmt] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Exchange rate used across the cart page (VND per USD)
  const EXCHANGE_RATE = process.env.REACT_APP_VND_RATE ? Number(process.env.REACT_APP_VND_RATE) : 23500;

  // Fetch cart on mount and when token changes
  useEffect(() => {
    if (token) {
      dispatch(fetchCart());
    } else {
      navigate('/signin');
      toast.info('Please login to view your cart');
    }
  }, [dispatch, token, navigate]);

  // Calculate total amount for selected items
  useEffect(() => {
    let price = 0;
    cartItems.forEach((item) => {
      if (selectedItems.includes(item.productId._id)) {
        if (item.productId && item.productId.price) {
          price += item.productId.price * item.quantity;
        }
      }
    });
    setTotalAmt(price);
  }, [cartItems, selectedItems]);

  // Handle select/deselect all
  useEffect(() => {
    if (selectAll && cartItems.length > 0) {
      const allItemIds = cartItems.map(item => item.productId._id);
      setSelectedItems(allItemIds);
    } else if (!selectAll) {
      setSelectedItems([]);
    }
  }, [selectAll, cartItems]);

  // Handle reset cart
  const handleResetCart = () => {
    if (window.confirm('Are you sure you want to reset your cart?')) {
      dispatch(resetCart());
      setSelectedItems([]);
      setSelectAll(false);
    }
  };

  // Handle remove selected items
  const handleRemoveSelected = () => {
    if (selectedItems.length === 0) {
      toast.warn('No items selected');
      return;
    }
    
    setIsProcessing(true);
    dispatch(removeSelectedItems(selectedItems))
      .then(() => {
        setSelectedItems([]);
        setSelectAll(false);
        toast.success('Selected items removed');
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  // Handle update quantity
  const handleUpdateQuantity = (productId, quantity) => {
    // Get the cart item
    const item = cartItems.find(item => item.productId._id === productId);
    
    // Check if item exists and has inventory data
    if (item && item.productId && item.productId.inventoryQuantity !== undefined) {
      // Check if requested quantity exceeds inventory
      if (quantity > item.productId.inventoryQuantity) {
        toast.warning(`Cannot add more than ${item.productId.inventoryQuantity} items (available in stock)`);
        return;
      }
    }
    
    dispatch(updateCartItem({ productId, quantity }));
  };

  // Handle remove item
  const handleRemoveItem = (productId) => {
    dispatch(removeCartItem(productId));
    setSelectedItems(prev => prev.filter(id => id !== productId));
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Proceed to checkout
  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select products to checkout");
      return;
    }
    navigate("/checkout", { state: { selectedItems } });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress sx={{ color: '#0F52BA' }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

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
          Shopping Cart
        </Typography>
        
        {cartItems.length > 0 ? (
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  mb: { xs: 3, md: 0 },
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={selectAll}
                      onChange={() => setSelectAll(!selectAll)}
                      sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }}
                    />
                    <Typography variant="body1" fontWeight={500}>
                      Select All ({cartItems.length} items)
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="outlined"
                    startIcon={<DeleteSweepIcon />}
                    onClick={handleResetCart}
                    size="small"
                    color="error"
                  >
                    Clear Cart
                  </Button>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {/* Group items by seller */}
                {(() => {
                  const groups = {};
                  cartItems.forEach((item) => {
                    const sellerObj = item.productId?.seller || item.productId?.sellerId || item.productId?.store?.sellerId || { _id: 'unknown', username: 'Unknown Seller' };
                    const sellerId = sellerObj?._id || sellerObj || 'unknown';
                    const sellerName = (sellerObj && (sellerObj.username || sellerObj.fullname)) || (item.productId?.store && item.productId.store.name) || 'Unknown Seller';
                    if (!groups[sellerId]) groups[sellerId] = { sellerName, items: [] };
                    groups[sellerId].items.push(item);
                  });

                  return Object.keys(groups).map((sellerId) => {
                    const group = groups[sellerId];
                    return (
                      <Box key={sellerId} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" fontWeight={700}>
                            <Link to="#" style={{ textDecoration: 'none', color: '#0F52BA' }}>{group.sellerName}</Link>
                          </Typography>
                          <Link to="#" style={{ textDecoration: 'none', color: '#555' }}>Pay only this seller</Link>
                        </Box>

                        {group.items.map((item) => (
                          <Fade key={item.productId?._id || Math.random()} in={true}>
                            <Card 
                              sx={{ 
                                mb: 2, 
                                display: 'flex', 
                                position: 'relative',
                                borderRadius: 2,
                                overflow: 'visible',
                                boxShadow: 'none',
                                border: '1px solid #eee'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                                <Checkbox
                                  checked={selectedItems.includes(item.productId._id)}
                                  onChange={() => toggleItemSelection(item.productId._id)}
                                  sx={{ color: '#0F52BA', '&.Mui-checked': { color: '#0F52BA' } }}
                                />
                              </Box>

                              <Box 
                                sx={{ 
                                  width: 100, 
                                  height: 100, 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  p: 1
                                }}
                              >
                                <CardMedia
                                  component="img"
                                  image={item.productId?.image}
                                  alt={item.productId?.name || "Product"}
                                  sx={{ 
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                  }}
                                />
                              </Box>

                              <CardContent sx={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <Box sx={{ width: '100%' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    {/* Middle: title, condition */}
                                    <Box sx={{ pr: 2, flex: 1 }}>
                                      {item.productId?.otherCartsCount ? (
                                        <Box sx={{ display: 'inline-block', mb: 0.5 }}>
                                          <Box sx={{ display: 'inline-block', border: '1px solid #1e88e5', color: '#1e88e5', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                                            IN {item.productId.otherCartsCount} OTHER CARTS
                                          </Box>
                                        </Box>
                                      ) : null}

                                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                                        <Link to={`/product/${item.productId?._id}`} style={{ textDecoration: 'underline', color: '#0F52BA' }}>
                                          {item.productId?.title || item.productId?.name || "Product Name"}
                                        </Link>
                                      </Typography>

                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {item.productId?.condition || 'New'}
                                      </Typography>
                                    </Box>

                                    {/* Right: qty + price side-by-side */}
                                    <Box sx={{ width: 260, textAlign: 'right', flexShrink: 0 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <Typography variant="body2" sx={{ mr: 1 }}>Qty</Typography>
                                          <Box component="select" value={item.quantity} onChange={(e) => handleUpdateQuantity(item.productId._id, Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>
                                            {Array.from({ length: Math.max(10, (item.productId?.inventoryQuantity || 10)) }).slice(0, 10).map((_, i) => (
                                              <option key={i} value={i + 1}>{i + 1}</option>
                                            ))}
                                          </Box>
                                        </Box>

                                        <Box sx={{ textAlign: 'right' }}>
                                          <Typography variant="h6" fontWeight={700} sx={{ color: '#000' }}>
                                            US ${((item.productId?.price || 0) * item.quantity).toFixed(2)}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">({new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.round((item.productId?.price || 0) * item.quantity * EXCHANGE_RATE))} VND)</Typography>
                                        </Box>
                                      </Box>

                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        {item.productId?.shippingMethod || 'eBay SpeedPAK'} {item.productId?.shippingSpeed || 'Economy'}
                                      </Typography>

                                      <Typography variant="body2" sx={{ color: 'green', fontWeight: 700, mt: 1 }}>Free shipping</Typography>
                                      <Typography variant="caption" color="text.secondary">Returns accepted</Typography>
                                    </Box>
                                  </Box>

                                  {/* Actions row placed at bottom of card content */}
                                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                                    <Link to="#" onClick={() => toast.info('Buy it now - flow not implemented')} style={{ marginRight: 16 }}>Buy it now</Link>
                                    <Link to="#" onClick={() => toast.info('Save for later - flow not implemented')} style={{ marginRight: 16 }}>Save for later</Link>
                                    <Link to="#" onClick={() => handleRemoveItem(item.productId._id)} style={{ color: '#d32f2f' }}>Remove</Link>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          </Fade>
                        ))}
                      </Box>
                    );
                  });
                })()}
                
                {selectedItems.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleRemoveSelected}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Removing...' : `Remove Selected (${selectedItems.length})`}
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  position: 'sticky',
                  top: 24,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                }}
              >
                <Divider sx={{ mb: 2 }} />

                {/* Simple VND conversion + shipping calc for display */}
                <Box sx={{ mb: 3 }}>
                  {(() => {
                    const EXCHANGE_RATE = process.env.REACT_APP_VND_RATE ? Number(process.env.REACT_APP_VND_RATE) : 23500; // VND per USD
                    const itemsCount = cartItems.length;
                    const subtotalVND = Math.round(totalAmt * EXCHANGE_RATE);
                    const shippingPerItem = 9406.5; // chosen to match sample (2 items -> 18813)
                    const shippingFee = Math.round(itemsCount * shippingPerItem);
                    const totalVND = subtotalVND + shippingFee;
                    const formatVND = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' VND';
                    const postal = '440000';

                    return (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1">Items ({itemsCount})</Typography>
                          <Typography variant="body1">{formatVND(subtotalVND)}</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2">Shipping to {postal} </Typography>
                            <Typography variant="caption" color="text.secondary">Delivery estimate & fees</Typography>
                          </Box>
                          <Typography variant="body1">{formatVND(shippingFee)}</Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" fontWeight={600}>Subtotal</Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.25rem' }}>{formatVND(totalVND)}</Typography>
                        </Box>
                      </>
                    );
                  })()}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleProceedToCheckout}
                  disabled={selectedItems.length === 0}
                  sx={{ 
                    py: 1.8,
                    backgroundColor: '#0f62ff',
                    borderRadius: '999px',
                    boxShadow: '0 8px 24px rgba(15,98,255,0.18)',
                    '&:hover': { backgroundColor: '#0b4ed6' },
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}
                >
                  Go to checkout
                </Button>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Purchase protected by <Link to="#">eBay Money Back Guarantee</Link></Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Paper 
            elevation={3} 
            sx={{ 
              p: 6, 
              textAlign: 'center',
              borderRadius: 2,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 80, color: '#0F52BA', opacity: 0.3, mb: 2 }} />
              
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Your Cart is Empty
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                Your shopping cart lives to serve. Give it purpose - fill it with products, electronics, clothes, and more!
              </Typography>
              
              <Button
                variant="contained"
                component={Link}
                to="/"
                startIcon={<ShoppingBagIcon />}
                sx={{ 
                  px: 4,
                  py: 1.2,
                  backgroundColor: '#0F52BA',
                  '&:hover': {
                    backgroundColor: '#0A3C8A',
                  }
                }}
              >
                Start Shopping
              </Button>
            </motion.div>
          </Paper>
        )}
      </motion.div>
    </Container>
  );
};

export default Cart;