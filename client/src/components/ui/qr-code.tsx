import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: "L" | "M" | "Q" | "H";
  title?: string;
  includeMargin?: boolean;
  className?: string;
}

export function QRCode({
  value,
  size = 128,
  bgColor = "#FFFFFF",
  fgColor = "#000000",
  level = "L",
  title,
  includeMargin = false,
  className,
}: QRCodeProps) {
  // Format the URL correctly with hostname
  const qrValue = useMemo(() => {
    // Get the current hostname for QR code
    const hostname = window.location.origin;
    
    // If it's already a full URL, use it
    if (value.startsWith("http")) {
      return value;
    }
    
    // Otherwise, append to hostname
    return `${hostname}${value.startsWith("/") ? "" : "/"}${value}`;
  }, [value]);

  return (
    <div className={className}>
      <QRCodeSVG
        value={qrValue}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
        includeMargin={includeMargin}
        title={title}
      />
    </div>
  );
}
