import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Provider } from "react-redux";
import store from "./redux/store.js";
import { Toaster } from "react-hot-toast";
import { RecoilRoot } from "recoil";
createRoot(document.getElementById("root")).render(
<RecoilRoot>
    <Provider store={store}>
      <Toaster position="top-right" />
      <ToastContainer />
      <App />
    </Provider>
  </RecoilRoot>

);
