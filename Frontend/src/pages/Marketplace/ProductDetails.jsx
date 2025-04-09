import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import { MessageCircle, Heart, ShoppingCart } from "lucide-react";

const SERVER_URL = "https://campus-connect-1-7rgs.onrender.com";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewError, setReviewError] = useState("");

  // Function to fetch reviews
  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/marketplace/products/${id}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/api/marketplace/products/${id}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    const checkWishlist = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/api/marketplace/wishlist`, { withCredentials: true });
        let data=response.data.filter((item) => item._id === id);
        if(data.length>0){
          setIsInWishlist(true);
        }else{  
          setIsInWishlist(false);
        }
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };

    fetchProduct();
    fetchReviews();
    checkWishlist();
  }, [id]);

  const addToWishlist = async () => {
    try {
      await axios.post(`${SERVER_URL}/api/marketplace/wishlist/${id}`, {}, { withCredentials: true });
      setIsInWishlist(true);
      toast.success("Added to Wishlist!", {
        style: { background: "#333", color: "#fff" },
      });
    
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist", {
        style: { background: "#333", color: "#fff" },
      });
    }
  };

  const handleAddReview = async () => {
    if (!reviewText.trim()) {
      toast.error("Review cannot be empty");
      return;
    }
    try {
      await axios.post(
        `${SERVER_URL}/api/marketplace/products/${id}/reviews`,
        { rating, text: reviewText },
        { withCredentials: true }
      );
      fetchReviews();
      setReviewText("");
      setRating(5);
      setReviewError("");
      toast.success("Review added successfully!");
    } catch (error) {
      console.error("Error adding review:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Error adding review");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await axios.delete(`${SERVER_URL}/api/marketplace/products/${id}/reviews/${reviewId}`, {
        withCredentials: true,
      });
      fetchReviews();
      toast.success("Review deleted successfully");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  // Buy Now function – initiates payment using Razorpay test mode
  const handleBuyNow = async () => {
    if (!userId) {
      toast.error("Please log in to purchase this product.");
      return;
    }
    try {
      const response = await axios.post(
        `${SERVER_URL}/api/marketplace/${id}/buy`,
        { buyerId: userId },
        { withCredentials: true }
      );
      const { orderId, amount, currency, key } = response.data;

      const options = {
        key, // Razorpay Test Key ID
        amount, // Amount in paise
        currency,
        name: "Campus Connect Marketplace",
        description: `Purchase of ${product.title}`,
        order_id: orderId,
        handler: async function (razorpayResponse) {
          try {
            await axios.post(
              `${SERVER_URL}/api/marketplace/verify-payment`,
              {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                productId: id,
                buyerId: userId
              },
              { withCredentials: true }
            );
            toast.success("Payment successful! Product purchased.");
            navigate("/marketplace/orders");
          } catch (error) {
            console.error("Payment verification failed:", error);
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user.username,
          email: user.email,
        },
        theme: { color: "#3399cc" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error initiating purchase:", error);
      toast.error("Purchase failed. Please try again.");
    }
  };

  // Unified button variants
  const buttonVariants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-500/50",
    secondary: "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg hover:shadow-emerald-500/50",
    tertiary: "bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/50"
  };

  const buttonClasses = (variant = "primary") =>
    `px-4 py-3 rounded-lg w-full flex justify-center items-center space-x-2 transition-all duration-300 ${buttonVariants[variant]} disabled:opacity-50 disabled:cursor-not-allowed`;

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500"></div>
      </div>
    );

  if (!product)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <p className="text-red-500 text-xl">Product not found</p>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-900 to-black min-h-screen text-white flex items-center justify-center">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 justify-center">
          {/* Left Column: Product Details */}
          <div className="lg:w-1/2 bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700 transition-all hover:shadow-2xl hover:shadow-indigo-500/30">
            <div className="relative h-72 mb-4 overflow-hidden rounded-lg">
              {product.images?.length > 1 ? (
                <>
                  <img
                    src={product.images[currentImage]}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-lg transition-opacity duration-300 hover:brightness-110"
                  />
                  <div className="absolute inset-0 flex justify-between items-center px-2">
                    <button
                      onClick={() =>
                        setCurrentImage((prev) =>
                          prev === 0 ? product.images.length - 1 : prev - 1
                        )
                      }
                      className="bg-black bg-opacity-50 hover:bg-opacity-70 p-2 rounded-full text-white shadow-lg transition-all hover:shadow-indigo-500/50"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImage((prev) =>
                          prev === product.images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="bg-black bg-opacity-50 hover:bg-opacity-70 p-2 rounded-full text-white shadow-lg transition-all hover:shadow-indigo-500/50"
                    >
                      ▶
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                    <div className="flex space-x-2">
                      {product.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImage(index)}
                          className={`w-2 h-2 rounded-full ${currentImage === index ? "bg-white" : "bg-gray-500"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>

            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">
              {product.title}
            </h2>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xl text-green-400 font-semibold">₹{product.price}</p>
              {product.averageRating > 0 && (
                <div className="flex items-center text-yellow-400">
                  <span className="text-lg mr-1">{product.averageRating.toFixed(1)}</span>
                  <span>⭐</span>
                </div>
              )}
            </div>

            <p className="text-gray-300 mb-4">{product.description}</p>
            <div className="border-t border-gray-700 pt-4 mb-4">
              <p className="text-gray-300 flex items-center">
                <span className="text-gray-500 mr-2">Seller:</span>
                {product.sellerId?.username || "Unknown"}
              </p>
            </div>

            {userId === product.sellerId?._id ? (
              <div className="bg-yellow-500 bg-opacity-20 border border-yellow-600 rounded-lg p-3 text-center">
                <p className="text-yellow-400">You are the seller of this product</p>
              </div>
            ) : product.sold ? (
              <div className="space-y-3">
                <div className="bg-red-500 bg-opacity-20 border border-red-600 rounded-lg p-3 text-center">
                  <p className="text-red-400">Product Sold</p>
                </div>
                <button
                  onClick={addToWishlist}
                  disabled={isInWishlist}
                  className={buttonClasses("tertiary")}
                >
                  <Heart className="w-5 h-5" />
                  <span>{isInWishlist ? "Added to Wishlist" : "Add to Wishlist"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/chat/${product.sellerId._id}`)}
                  className={buttonClasses("secondary")}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Message Seller</span>
                </button>
                <button
                  onClick={addToWishlist}
                  disabled={isInWishlist}
                  className={buttonClasses("tertiary")}
                >
                  <Heart className="w-5 h-5" />
                  <span>{isInWishlist ? "Added to Wishlist" : "Add to Wishlist"}</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className={buttonClasses("primary")}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Buy Now</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Reviews */}
          <div className="lg:w-1/2 bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700 transition-all hover:shadow-2xl hover:shadow-indigo-500/30">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 flex items-center">
              Reviews
              {reviews.length > 0 && (
                <span className="ml-2 bg-gray-700 text-sm px-2 py-1 rounded-full">
                  {reviews.length}
                </span>
              )}
            </h3>

            {reviews.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-gray-700 p-4 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center mb-2">
                        <div className="bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                          {review.user?.username?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-gray-300 font-medium">{review.user?.username || "Anonymous"}</span>
                      </div>
                      <div className="flex items-center text-yellow-400">
                        <span>{review.rating}</span>
                        <span className="ml-1">⭐</span>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-2">{review.text}</p>
                    {review.user?._id === userId && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="text-red-400 hover:text-red-500 text-sm flex items-center transition-colors"
                        >
                          <span className="mr-1">🗑</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-6 text-center">
                <p className="text-gray-400">No reviews yet for this product.</p>
              </div>
            )}

            {userId && userId !== product.sellerId?._id && (
              <div className="mt-6 border-t border-gray-700 pt-4">
                <h4 className="text-xl font-bold text-white mb-3">Add a Review</h4>
                {reviewError && (
                  <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-2 mb-3">
                    <p className="text-red-400 text-sm">{reviewError}</p>
                  </div>
                )}
                <textarea
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 hover:border-indigo-500"
                  placeholder="Write your review here..."
                  rows="3"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center bg-gray-700 rounded-lg px-3 border border-gray-600">
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="bg-gray-700 text-white py-2 focus:outline-none"
                    >
                      {[5, 4, 3, 2, 1].map((num) => (
                        <option key={num} value={num}>
                          {num} ⭐
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAddReview}
                    disabled={!reviewText.trim()}
                    className={`flex-1 py-2 rounded-lg transition-all duration-300 ${!reviewText.trim()
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : buttonClasses("primary")
                      }`}
                  >
                    Submit Review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;