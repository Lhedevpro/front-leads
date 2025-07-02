import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  AppBar,
  Toolbar,
  Avatar,
  createTheme,
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Twitter,
  Refresh
} from '@mui/icons-material';
import axios from 'axios';
import web3Service from './services/web3Service';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003/api';

// Configuration axios avec header secret pour bloquer les appels externes
axios.defaults.headers.common['x-site-access'] = 'web3-prospects-2024-secret-key';
axios.defaults.headers.common['x-origin'] = window.location.origin;

// Fonction helper pour les chemins d'images
const getImagePath = (imageName) => {
  const publicUrl = process.env.PUBLIC_URL || '';
  return `${publicUrl}/imgs/${imageName}`;
};

// Thème sombre rouge et noir
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff4444',
    },
    secondary: {
      main: '#ff6666',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid #333333',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(255, 68, 68, 0.1)',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(255, 68, 68, 0.2)',
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)',
          borderBottom: '1px solid #333333',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        outlined: {
          borderColor: '#ff4444',
          color: '#ff4444',
          '&:hover': {
            borderColor: '#ff6666',
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)',
          color: '#ffffff',
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [contractPrices, setContractPrices] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const checkWalletConnection = useCallback(async () => {
    if (web3Service.isWalletConnected()) {
      setWalletConnected(true);
      const address = await web3Service.getWalletAddress();
      setWalletAddress(address);
      await loadContractPrices();
    }
  }, []);

  const loadContractPrices = async () => {
    try {
      const prices = await web3Service.getPrices();
      setContractPrices(prices);
    } catch (error) {
      console.error('Error loading contract prices:', error);
    }
  };

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const headers = {
        'x-site-access': 'web3-prospects-2024-secret-key',
        'x-origin': window.location.origin
      };
      
      // Ajouter l'adresse wallet si connectée
      if (walletAddress) {
        headers['x-user-address'] = walletAddress;
      }
      
      const response = await axios.get(`${API_BASE_URL}/prospects-vendables`, { headers });
      setLeads(response.data.prospects || []);
      setMetadata(response.data.metadata);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to access vault');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadLeads();
    checkWalletConnection();
  }, [loadLeads, checkWalletConnection]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      const result = await web3Service.connectWallet();
      setWalletAddress(result.address);
      setWalletConnected(true);
      setSuccess('Wallet connected successfully!');
      
      // Charger les prix du contrat
      await loadContractPrices();
      
      // Attendre un peu avant de recharger les leads
      setSuccess('Wallet connected successfully! Loading your prospects...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Recharger les leads avec la nouvelle adresse
      await loadLeads();
      
      setSuccess('Wallet connected successfully! Your prospects have been updated.');
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setSuccess('Wallet disconnected');
  };

  const handlePurchaseClick = (packageInfo) => {
    if (!walletConnected) {
      setError('Please connect your wallet first to purchase leads');
      return;
    }
    setSelectedPackage(packageInfo);
    setPurchaseDialog(true);
  };

  const handlePurchaseConfirm = async () => {
    if (!selectedPackage) return;

    try {
      setPurchaseLoading(true);
      setPurchaseDialog(false);
      
      // Acheter les leads via le contrat
      const result = await web3Service.buyLeads(selectedPackage.leads, 2);
      
      setSuccess(`Successfully purchased access to ${result.leads} fresh leads for ${result.price} ETH! Transaction: ${result.hash}`);
      
      // Attendre un peu avant de recharger les leads
      setSuccess(`Vault access successful! Loading your fresh leads...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recharger les leads pour voir les nouveaux
      await loadLeads();
      
      setSuccess(`Vault access completed! You now have access to ${result.leads} additional fresh leads.`);
      
    } catch (err) {
      setError(err.message || 'Failed to purchase leads');
      console.error(err);
    } finally {
      setPurchaseLoading(false);
      setSelectedPackage(null);
    }
  };

  const handlePurchaseCancel = () => {
    setPurchaseDialog(false);
    setSelectedPackage(null);
  };

  // Fonction pour formater les prix ETH
  const formatEthPrice = (priceInEth) => {
    const price = parseFloat(priceInEth);
    // Utiliser toFixed pour éviter les erreurs de précision, puis retirer les zéros inutiles
    return parseFloat(price.toFixed(6)).toString().replace(/\.?0+$/, '');
  };

  // Configuration des packages de leads
  const leadPackages = [
    {
      id: 1,
      leads: 10,
      price: contractPrices?.base ? formatEthPrice(parseFloat(contractPrices.base) * 10) : '0.005',
      description: 'Fresh leads for small outreach',
      popular: false,
      backgroundImage: getImagePath('renard.png')
    },
    {
      id: 2,
      leads: 25,
      price: contractPrices?.medium ? formatEthPrice(parseFloat(contractPrices.medium) * 25) : '0.010',
      description: 'Most popular vault access',
      popular: true,
      backgroundImage: getImagePath('limier.png')
    },
    {
      id: 3,
      leads: 50,
      price: contractPrices?.high ? formatEthPrice(parseFloat(contractPrices.high) * 50) : '0.018',
      description: 'Full vault access for large campaigns',
      popular: false,
      backgroundImage: getImagePath('aigle.png')
    }
  ];

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ 
        flexGrow: 1, 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 68, 68, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 68, 68, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }
      }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ 
              flexGrow: 1, 
              background: 'linear-gradient(45deg, #ff4444, #ff6666)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: '1.5rem'
            }}>
              🏦 Fresh Leads Vault
            </Typography>
            
            {/* Wallet Connection */}
            {!walletConnected ? (
              <Button 
                variant="outlined"
                onClick={connectWallet}
                disabled={loading}
                sx={{
                  mr: 2,
                  borderColor: '#ff4444',
                  color: '#ff4444',
                  '&:hover': {
                    borderColor: '#ff6666',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                  }
                }}
              >
                {loading ? <CircularProgress size={20} /> : '🔗 Connect Wallet'}
              </Button>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Typography variant="body2" sx={{ 
                  color: '#00ff66',
                  mr: 2,
                  fontSize: '0.8rem'
                }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Typography>
                <Button 
                  variant="outlined"
                  size="small"
                  onClick={disconnectWallet}
                  sx={{
                    borderColor: '#ff6666',
                    color: '#ff6666',
                    fontSize: '0.7rem',
                    '&:hover': {
                      borderColor: '#ff8888',
                      backgroundColor: 'rgba(255, 102, 102, 0.1)',
                    }
                  }}
                >
                  Disconnect
                </Button>
              </Box>
            )}
            
            <Button 
              color="inherit" 
              startIcon={<Refresh />}
              onClick={loadLeads}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)',
                color: '#ffffff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ff6666 0%, #ff8888 100%)',
                }
              }}
            >
              Refresh
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3, position: 'relative', zIndex: 1 }}>
          {/* Disclaimer */}
          {showDisclaimer && (
            <Card sx={{ 
              mb: 3,
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(42, 42, 42, 0.8) 100%)',
              border: '1px solid rgba(255, 68, 68, 0.3)',
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(255, 68, 68, 0.1)',
              backdropFilter: 'blur(10px)',
              position: 'relative'
            }}>
              <Button
                onClick={() => setShowDisclaimer(false)}
                sx={{
                  position: 'absolute',
                  top: 24,
                  right: 24,
                  minWidth: 'auto',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255, 68, 68, 0.2)',
                  color: 'rgba(255, 68, 68, 0.8)',
                  border: '1px solid rgba(255, 68, 68, 0.3)',
                  '&:hover': {
                    background: 'rgba(255, 68, 68, 0.3)',
                    color: 'rgba(255, 68, 68, 1)',
                  },
                  zIndex: 2
                }}
              >
                ✕
              </Button>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ 
                  color: 'rgba(255, 68, 68, 0.9)',
                  fontWeight: 600,
                  mb: 3,
                  fontSize: '1.4rem'
                }}>
                  ⚠️ Fresh Leads Vault - What you're buying
                </Typography>
                
                <Typography variant="h6" sx={{ 
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontWeight: 500,
                  mb: 3,
                  fontSize: '1.2rem',
                  lineHeight: 1.5
                }}>
                  Active Web3 profiles, not guaranteed contracts.
                </Typography>
                
                <Typography variant="body1" sx={{ 
                  color: 'rgba(204, 204, 204, 0.8)',
                  mb: 4,
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                  maxWidth: 600,
                  mx: 'auto'
                }}>
                  You're buying access to curated, active Web3 profiles - people who are actually engaging in the space, not just passive accounts.
                </Typography>
                
                <Typography variant="h6" sx={{ 
                  color: 'rgba(255, 102, 102, 0.9)',
                  fontWeight: 600,
                  mb: 3,
                  fontSize: '1.3rem'
                }}>
                  About the Fresh Leads Vault
                </Typography>
                
                <Box sx={{ maxWidth: 700, mx: 'auto' }}>
                  <Typography variant="body1" sx={{ 
                    color: 'rgba(204, 204, 204, 0.8)',
                    mb: 2,
                    fontSize: '1.05rem',
                    lineHeight: 1.7
                  }}>
                    This vault contains manually curated Web3 profiles with recent activity.
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    color: 'rgba(204, 204, 204, 0.8)',
                    mb: 2,
                    fontSize: '1.05rem',
                    lineHeight: 1.7
                  }}>
                    Each profile has been verified for genuine engagement in the Web3 ecosystem.
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    color: 'rgba(255, 68, 68, 0.9)',
                    fontWeight: 500,
                    mb: 2,
                    fontSize: '1.05rem',
                    lineHeight: 1.7
                  }}>
                    ⚠️ These are potential clients, not guaranteed sales.
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    color: 'rgba(204, 204, 204, 0.8)',
                    mb: 2,
                    fontSize: '1.05rem',
                    lineHeight: 1.7
                  }}>
                    The value: saving you hours of research to find active Web3 users.
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    color: 'rgba(204, 204, 204, 0.8)',
                    fontSize: '1.05rem',
                    lineHeight: 1.7
                  }}>
                    You still need to engage them properly to convert leads into clients.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Section d'achat de leads */}
          <Card sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
            border: '1px solid #333333',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(255, 68, 68, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${getImagePath('forest.png')}`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.4,
              zIndex: 0
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h5" sx={{ 
                color: '#ffffff',
                fontWeight: 700,
                mb: 2,
                textAlign: 'center',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}>
                🏦 Access Fresh Leads Vault
              </Typography>
              
              <Grid container spacing={2} justifyContent="center">
                {leadPackages.map((pkg) => (
                  <Grid item xs={12} sm={6} md={4} key={pkg.id} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Card sx={{ 
                      background: pkg.popular 
                        ? 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)'
                        : 'linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%)',
                      border: pkg.popular ? '1px solid #ff8888' : '1px solid #444444',
                      borderRadius: 8,
                      p: 4,
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: 300,
                      width: 320,
                      flexShrink: 0,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(${pkg.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.6,
                        zIndex: 0
                      },
                      ...(pkg.popular && {
                        '&::after': {
                          content: '"🔥"',
                          position: 'absolute',
                          top: -10,
                          right: 10,
                          fontSize: '1.5rem',
                          zIndex: 2
                        }
                      })
                    }}>
                      <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h6" sx={{ 
                          color: '#ffffff', 
                          fontWeight: 700, 
                          mb: 1,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                        }}>
                          {pkg.leads} Leads
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          color: '#ffffff', 
                          fontWeight: 700, 
                          mb: 1,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                        }}>
                          {pkg.price} ETH
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#ffffff', 
                          mb: 2,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          fontWeight: 500
                        }}>
                          {pkg.description}
                        </Typography>
                        <Button 
                          variant="contained" 
                          onClick={() => handlePurchaseClick(pkg)}
                          disabled={!walletConnected || purchaseLoading}
                          sx={{
                            background: pkg.popular 
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)',
                            color: '#ffffff',
                            border: pkg.popular ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                            '&:hover': {
                              background: pkg.popular 
                                ? 'rgba(255, 255, 255, 0.3)'
                                : 'linear-gradient(135deg, #ff6666 0%, #ff8888 100%)',
                            },
                            '&:disabled': {
                              background: 'linear-gradient(135deg, #666666 0%, #888888 100%)',
                            }
                          }}
                        >
                          {purchaseLoading ? <CircularProgress size={20} /> : 'Pay with ETH'}
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Alert severity="info" sx={{ 
                mt: 3,
                background: 'linear-gradient(135deg, #0066cc 0%, #0088ff 100%)',
                color: '#ffffff',
                border: '1px solid #00aaff',
                '& .MuiAlert-icon': {
                  color: '#ffffff'
                }
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  🏦 Smart contract powered! Connect your wallet to access the Fresh Leads Vault with ETH.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  Access to curated, active Web3 profiles. Larger purchases unlock better rates!
                </Typography>
              </Alert>
            </CardContent>
          </Card>

          {/* Messages d'état */}
          {error && (
            <Alert severity="error" sx={{ 
              mb: 2, 
              background: 'linear-gradient(135deg, #ff4444 0%, #cc3333 100%)',
              color: '#ffffff',
              border: '1px solid #ff6666'
            }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ 
              mb: 2, 
              background: 'linear-gradient(135deg, #00cc44 0%, #00aa33 100%)',
              color: '#ffffff',
              border: '1px solid #00ff66'
            }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Message d'accès limité */}
          {metadata?.isLimited && (
            <Alert severity="warning" sx={{ 
              mb: 2, 
              background: 'linear-gradient(135deg, #ff8800 0%, #ff6600 100%)',
              color: '#ffffff',
              border: '1px solid #ffaa00'
            }}>
               {metadata.message}
            </Alert>
          )}

          {/* Message d'accès complet */}
          {metadata && !metadata.isLimited && (
            <Alert severity="success" sx={{ 
              mb: 2, 
              background: 'linear-gradient(135deg, #00cc44 0%, #00aa33 100%)',
              color: '#ffffff',
              border: '1px solid #00ff66'
            }}>
              ✅ {metadata.message}
            </Alert>
          )}

          {/* Actions principales */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ 
                color: '#cccccc',
                background: 'linear-gradient(45deg, #ff4444, #ff6666)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600
              }}>
                {leads.length} fresh leads available in vault
                {metadata?.isLimited && ` (${metadata.freeProspects} free + ${metadata.leadsPurchased} purchased on ${metadata.maxAvailableProspects} total)`}
                {metadata && !metadata.isLimited && metadata.remainingLeads > 0 && ` (${metadata.remainingLeads} additional leads in queue)`}
                {metadata && !metadata.isLimited && metadata.remainingLeads === 0 && ` (vault access complete)`}
              </Typography>
            </Box>
          </Box>

          {/* Liste des leads */}
          {loading ? (
            <LinearProgress sx={{ 
              background: '#333333',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #ff4444 0%, #ff6666 100%)',
              }
            }} />
          ) : (
            <Box>
              {leads.map((lead, index) => (
                <Card key={index} sx={{ 
                  mb: 2,
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                  border: '1px solid #333333',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(255, 68, 68, 0.1)',
                  '&:hover': {
                    boxShadow: '0 12px 40px rgba(255, 68, 68, 0.2)',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease',
                  },
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        src={lead.avatar} 
                        alt={lead.nom}
                        sx={{ 
                          width: 56, 
                          height: 56, 
                          mr: 3,
                          border: '2px solid #ff4444',
                          boxShadow: '0 4px 16px rgba(255, 68, 68, 0.3)'
                        }}
                        onError={(e) => {
                          console.log('Erreur image pour:', lead.nom, lead.avatar);
                          e.target.style.display = 'none';
                        }}
                      >
                        {lead.nom?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" sx={{ 
                          color: '#ffffff',
                          fontWeight: 700,
                          mb: 0.5
                        }}>
                          {lead.nom}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#ff4444',
                          fontWeight: 600,
                          mb: 1
                        }}>
                          @{lead.handle}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          mt: 1,
                          color: '#cccccc',
                          lineHeight: 1.6
                        }}>
                          {lead.bio}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          {lead.tags.map((tag, tagIndex) => (
                            <Chip
                              key={tagIndex}
                              label={tag}
                              size="small"
                              sx={{ 
                                mr: 1, 
                                mb: 0.5,
                                background: 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)',
                                color: '#ffffff',
                                fontWeight: 600,
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #ff6666 0%, #ff8888 100%)',
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, ml: 3 }}>
                        <Button
                          size="medium"
                          variant="outlined"
                          startIcon={<Twitter />}
                          onClick={() => window.open(`https://x.com/${lead.handle}`, '_blank')}
                          sx={{ 
                            fontSize: '0.8rem',
                            borderColor: '#ff4444',
                            color: '#ff4444',
                            '&:hover': {
                              borderColor: '#ff6666',
                              backgroundColor: 'rgba(255, 68, 68, 0.1)',
                            }
                          }}
                        >
                          Profil X
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {leads.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ 
                color: '#cccccc',
                mb: 2
              }}>
                No fresh leads found
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#999999'
              }}>
                The vault is currently empty. Check back later for fresh leads.
              </Typography>
            </Box>
          )}
        </Container>

        {/* Dialog de confirmation d'achat */}
        <Dialog 
          open={purchaseDialog} 
          onClose={handlePurchaseCancel}
          PaperProps={{
            sx: {
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1px solid #333333',
              borderRadius: 12,
              minWidth: 400
            }
          }}
        >
          <DialogTitle sx={{ color: '#ffffff', fontWeight: 700 }}>
            🏦 Confirm Vault Access
          </DialogTitle>
          <DialogContent>
            {selectedPackage && (
              <Box>
                <Typography variant="body1" sx={{ color: '#cccccc', mb: 2 }}>
                  You are about to purchase access to <strong style={{ color: '#ff4444' }}>{selectedPackage.leads} fresh leads</strong> for <strong style={{ color: '#ff4444' }}>{selectedPackage.price} ETH</strong>.
                </Typography>
                <Typography variant="body2" sx={{ color: '#999999' }}>
                  This transaction will be processed on the blockchain and cannot be reversed.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handlePurchaseCancel}
              sx={{ 
                color: '#cccccc',
                '&:hover': { color: '#ffffff' }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePurchaseConfirm}
              disabled={purchaseLoading}
              sx={{
                background: 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)',
                color: '#ffffff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ff6666 0%, #ff8888 100%)',
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #666666 0%, #888888 100%)',
                }
              }}
            >
              {purchaseLoading ? <CircularProgress size={20} /> : 'Confirm Vault Access'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;
