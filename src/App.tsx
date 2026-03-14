import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StaffProvider } from "@/contexts/StaffContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ProductList from "@/pages/ProductList";
import ProductEdit from "@/pages/ProductEdit";
import BulkPriceUpload from "@/pages/BulkPriceUpload";
import CategoryList from "@/pages/CategoryList";
import BrandList from "@/pages/BrandList";
import OrderList from "@/pages/OrderList";
import OrderDetail from "@/pages/OrderDetail";
import QuoteList from "@/pages/QuoteList";
import QuoteDetail from "@/pages/QuoteDetail";
import CustomerList from "@/pages/CustomerList";
import CustomerDetail from "@/pages/CustomerDetail";
import BannerList from "@/pages/BannerList";
import StaffManagement from "@/pages/StaffManagement";
import Reports from "@/pages/Reports";
import ActivityLog from "@/pages/ActivityLog";
import SettingsPage from "@/pages/Settings";
import MyDeliveries from "@/pages/MyDeliveries";
import Promotions from "@/pages/Promotions";
import FlashDeals from "@/pages/FlashDeals";
import Coupons from "@/pages/Coupons";
import ReviewList from "@/pages/ReviewList";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <StaffProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProtectedRoute module="products"><ProductList /></ProtectedRoute>} />
                <Route path="products/:id" element={<ProtectedRoute module="products"><ProductEdit /></ProtectedRoute>} />
                <Route path="products/bulk-price" element={<ProtectedRoute module="products"><BulkPriceUpload /></ProtectedRoute>} />
                <Route path="categories" element={<ProtectedRoute module="categories"><CategoryList /></ProtectedRoute>} />
                <Route path="brands" element={<ProtectedRoute module="brands"><BrandList /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute module="orders"><OrderList /></ProtectedRoute>} />
                <Route path="orders/:id" element={<ProtectedRoute module="orders"><OrderDetail /></ProtectedRoute>} />
                <Route path="quotes" element={<ProtectedRoute module="quotes"><QuoteList /></ProtectedRoute>} />
                <Route path="quotes/:id" element={<ProtectedRoute module="quotes"><QuoteDetail /></ProtectedRoute>} />
                <Route path="customers" element={<ProtectedRoute module="customers"><CustomerList /></ProtectedRoute>} />
                <Route path="customers/:id" element={<ProtectedRoute module="customers"><CustomerDetail /></ProtectedRoute>} />
                <Route path="banners" element={<ProtectedRoute module="banners"><BannerList /></ProtectedRoute>} />
                <Route path="staff" element={<ProtectedRoute module="staff"><StaffManagement /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
                <Route path="activity" element={<ProtectedRoute module="activity"><ActivityLog /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute module="settings"><SettingsPage /></ProtectedRoute>} />
                <Route path="my-deliveries" element={<ProtectedRoute module="delivery"><MyDeliveries /></ProtectedRoute>} />
                <Route path="promotions" element={<ProtectedRoute module="promotions"><Promotions /></ProtectedRoute>} />
                <Route path="flash-deals" element={<ProtectedRoute module="flash_deals"><FlashDeals /></ProtectedRoute>} />
                <Route path="coupons" element={<ProtectedRoute module="coupons"><Coupons /></ProtectedRoute>} />
                <Route path="reviews" element={<ProtectedRoute module="reviews"><ReviewList /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </StaffProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
