import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 修复方法名错误
createRoot(document.getElementById("root")!).render(<App />);
