import { motion } from "framer-motion";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";

export default function WhatsAppButton() {
  return (
    <motion.a
      href={BRAND.whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      onClick={() => trackEvent("whatsapp_click", { source: "floating_button" })}
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-5 right-5 z-40 hidden h-14 w-14 items-center justify-center rounded-full shadow-lg sm:flex sm:bottom-7 sm:right-7 sm:h-16 sm:w-16"
      style={{ backgroundColor: "#25D366" }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: "#25D366", animation: "whatsapp-pulse 2.6s ease-out infinite" }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 32 32" className="relative h-7 w-7 sm:h-8 sm:w-8" fill="none" aria-hidden="true">
        <path
          fill="#ffffff"
          d="M16.004 3.2c-7.09 0-12.85 5.76-12.85 12.85 0 2.27.6 4.44 1.72 6.36L3.2 28.8l6.56-1.63a12.8 12.8 0 0 0 6.24 1.62h.01c7.09 0 12.85-5.76 12.85-12.85S23.1 3.2 16.004 3.2Zm0 23.36h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9.97 1.04-3.8-.25-.39a10.55 10.55 0 0 1-1.62-5.58c0-5.85 4.76-10.61 10.62-10.61 2.84 0 5.5 1.11 7.5 3.11a10.53 10.53 0 0 1 3.11 7.51c0 5.85-4.76 10.5-10.6 10.5Zm5.8-7.88c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.72.16-.21.32-.82 1.03-1.01 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.87-1.76-2.19-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.02-.56-.08-.16-.72-1.74-.99-2.38-.26-.62-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.79.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"
        />
      </svg>
    </motion.a>
  );
}
