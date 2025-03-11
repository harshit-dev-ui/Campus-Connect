import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0); // Track the displayed image index
  const [isInWishlist, setIsInWishlist] = useState(false); // Track wishlist status

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/marketplace/products/${id}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkWishlist = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/marketplace/wishlist", { withCredentials: true });
        setIsInWishlist(response.data.some((item) => item._id === id)); // Check if the product is already in wishlist
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };

    fetchProduct();
    checkWishlist();
  }, [id]);

  const addToWishlist = async () => {
    try {
      await axios.post(`http://localhost:3000/api/marketplace/wishlist/${id}`, {}, { withCredentials: true });
      setIsInWishlist(true); // Update the state to reflect wishlist addition
    } catch (error) {
      console.error("Error adding to wishlist:", error);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!product) return <p className="text-red-500">Product not found</p>;

  return (
    <div className="p-6 bg-gray-900 min-h-screen flex justify-center items-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 max-w-lg w-full">
        {/* Image Carousel */}
        {product.images.length > 1 ? (
          <div className="relative">
            <img
              src={product.images[currentImage]}
              alt={product.title}
              className="w-full h-60 object-cover rounded-lg"
            />
            <button
              onClick={() => setCurrentImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full"
            >
              ◀
            </button>
            <button
              onClick={() => setCurrentImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full"
            >
              ▶
            </button>
          </div>
        ) : (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-60 object-cover rounded-lg"
          />
        )}

        <h2 className="text-2xl font-bold text-white mt-4">{product.title}</h2>
        <p className="text-lg text-green-400 font-semibold">₹{product.price}</p>
        <p className="text-gray-400 mt-2">{product.description}</p>
        <p className="mt-4 text-gray-300">Seller: {product.sellerId.username}</p>

        <button
          onClick={addToWishlist}
          disabled={isInWishlist} // Disable button if already added
          className={`mt-4 text-white px-4 py-2 rounded-lg w-full ${
            isInWishlist ? "bg-gray-600 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isInWishlist ? "Added to Wishlist ✅" : "Add to Wishlist ❤️"}
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
