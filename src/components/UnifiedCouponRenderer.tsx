import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Star } from 'lucide-react';

interface Emoji {
  id: string;
  char: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
  opacity?: number;
  isImage?: boolean;
}

interface QRCodeDesignConfig {
  style: 'standard' | 'suave' | 'moderno' | 'elegante' | 'logo';
  color: string;
  backgroundColor: string;
  opacity: number;
  dotType: 'square' | 'rounded';
  cornerType: 'standard' | 'rounded';
  logoUrl?: string;
}

interface GreetingCouponConfig {
  title: string;
  message: string;
  showCustomerName: boolean;
  showOrderNumber: boolean;
  showLogo?: boolean;
  footerText: string;
  qrCodeText: string;
  logo?: string;
  showCompanyName?: boolean;
  format: '58mm' | '80mm' | 'a4' | 'a5' | 'a6' | 'custom' | 'thermal';
  orientation?: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  width?: number;
  height?: number;
  backgroundImage?: string;
  backgroundOpacity?: number;
  emojiOpacity?: number;
  emojis?: Emoji[];
  qrCodeDesign?: QRCodeDesignConfig;
}

interface UnifiedCouponRendererProps {
  config: GreetingCouponConfig;
  sale?: any;
  customer?: any;
  company: {
    name: string;
    logo?: string;
  };
  scale?: number;
  opacity?: number;
}

export const UnifiedCouponRenderer: React.FC<UnifiedCouponRendererProps> = ({
  config,
  sale,
  customer,
  company,
  scale = 1,
  opacity = 1
}) => {
  const getDimensions = () => {
    const isLandscape = config.orientation === 'landscape';
    switch (config.format) {
      case '58mm': return { width: 58, height: config.customHeight || config.height || 0 };
      case '80mm': return { width: 80, height: config.customHeight || config.height || 0 };
      case 'a4': return isLandscape ? { width: 297, height: 210 } : { width: 210, height: 297 };
      case 'a5': return isLandscape ? { width: 210, height: 148 } : { width: 148, height: 210 };
      case 'a6': return isLandscape ? { width: 148, height: 105 } : { width: 105, height: 148 };
      case 'custom': return { width: config.customWidth || config.width || 80, height: config.customHeight || config.height || 0 };
      case 'thermal': return { width: config.customWidth || config.width || 80, height: config.customHeight || config.height || 0 };
      default: return { width: 80, height: 0 };
    }
  };

  const { width: mmWidth, height: mmHeight } = getDimensions();
  const isA6 = config.format === 'a6';
  const isA5 = config.format === 'a5';
  const isThermal = config.format === '58mm' || config.format === '80mm' || config.format === 'thermal' || config.format === 'custom';

  const containerStyle: React.CSSProperties = {
    width: `${mmWidth}mm`,
    minHeight: isThermal ? (mmHeight > 0 ? `${mmHeight}mm` : '100mm') : mmHeight > 0 ? `${mmHeight}mm` : 'auto',
    height: !isThermal && mmHeight > 0 ? `${mmHeight}mm` : 'auto',
    backgroundColor: 'white',
    color: 'black',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: isThermal ? '3mm' : isA6 ? '4mm' : (isA5 ? '8mm' : '10mm'),
    boxSizing: 'border-box',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    opacity: opacity,
    fontFamily: "'Inter', sans-serif",
    boxShadow: scale < 1 ? '0 10px 25px rgba(0,0,0,0.1)' : 'none',
    border: scale < 1 ? '1px solid #e2e8f0' : 'none',
  };

  // Dynamic sizes for better fit on different paper sizes
  const logoMaxW = isA6 ? '35mm' : (isA5 ? '40mm' : '45mm');
  const logoMaxH = isA6 ? '15mm' : (isA5 ? '20mm' : '25mm');
  const titleSize = isA6 ? '20px' : (isA5 ? '24px' : '28px');
  const messageSize = isA6 ? '13px' : (isA5 ? '15px' : '16px');
  const qrSizeVal = isA6 ? 120 : (isA5 ? 160 : 180);
  const qrWrapperPadding = isA6 ? '3mm' : '4mm';
  const marginMd = isA6 ? '3mm' : '5mm';
  const marginLg = isA6 ? '5mm' : '8mm';
  const marginXl = isA6 ? '6mm' : '12mm';

  return (
    <div className="unified-coupon-renderer" style={containerStyle}>
      {/* Background Image */}
      {config.backgroundImage && (
        <img 
          src={config.backgroundImage} 
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: config.backgroundOpacity ?? 0.1,
            pointerEvents: 'none',
            zIndex: 0
          }}
          alt=""
          referrerPolicy="no-referrer"
        />
      )}

      {/* Emojis layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {config.emojis?.map((emoji) => (
          <div
            key={emoji.id}
            style={{
              position: 'absolute',
              left: `${emoji.x}%`,
              top: `${emoji.y}%`,
              fontSize: `${emoji.size}px`,
              transform: `translate(-50%, -50%) rotate(${emoji.rotation || 0}deg)`,
              opacity: emoji.opacity ?? config.emojiOpacity ?? 1,
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${emoji.size}px`,
              height: `${emoji.size}px`
            }}
          >
            {emoji.isImage ? (
              <img src={emoji.char} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" referrerPolicy="no-referrer" />
            ) : (
              emoji.char
            )}
          </div>
        ))}
      </div>

      {/* Content Header */}
      <div style={{ zIndex: 2, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ marginBottom: marginLg, textAlign: 'center' }}>
          {(config.showLogo && (config.logo || company.logo)) ? (
            <img 
              src={config.logo || company.logo} 
              style={{ maxWidth: logoMaxW, maxHeight: logoMaxH, objectFit: 'contain' }} 
              alt="Logo" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{ width: '12mm', height: '12mm', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifySelf: 'center', borderRadius: '3mm', border: '1px solid #e2e8f0', margin: '0 auto' }}>
              <Star size={isA6 ? 24 : 32} color="#cbd5e1" style={{ margin: '0 auto' }} />
            </div>
          )}
        </div>

        {config.showCompanyName && (
          <div style={{ fontSize: isA6 ? '8px' : '10px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '2px', marginBottom: marginMd }}>
            {company.name}
          </div>
        )}

        <h1 style={{ fontSize: titleSize, fontWeight: 900, textTransform: 'uppercase', marginBottom: marginLg, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1.1, textAlign: 'center' }}>
          {config.title || 'Obrigado!'}
        </h1>

        <p style={{ fontSize: messageSize, lineHeight: 1.4, fontStyle: 'italic', color: '#1e293b', marginBottom: marginXl, textAlign: 'center', maxWidth: '90%', fontWeight: '500' }}>
          "{config.message || 'Sua mensagem aqui...'}"
        </p>

        {/* QR Code Section */}
        <div style={{ marginBottom: marginLg, backgroundColor: 'white', padding: qrWrapperPadding, borderRadius: isA6 ? '4mm' : '8mm', border: '1px solid #f1f5f9', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', display: 'inline-block' }}>
          {sale?.youtubeLink ? (
            <div style={{ position: 'relative' }}>
              <QRCodeCanvas 
                value={sale.youtubeLink}
                size={qrSizeVal}
                level="H"
                fgColor={config.qrCodeDesign?.color || '#000000'}
                bgColor={config.qrCodeDesign?.backgroundColor || '#FFFFFF'}
              />
              {config.qrCodeDesign?.style === 'logo' && config.qrCodeDesign?.logoUrl && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ backgroundColor: 'white', padding: '1px', borderRadius: '2px' }}>
                    <img src={config.qrCodeDesign.logoUrl} style={{ width: isA6 ? '25px' : '40px', height: isA6 ? '25px' : '40px', objectFit: 'contain' }} alt="" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: `${qrSizeVal}px`, height: `${qrSizeVal}px`, backgroundColor: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold' }}>
              QR CODE
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ width: '100%', paddingTop: isA6 ? '4mm' : '8mm', borderTop: '1px solid #e2e8f0', marginTop: 'auto', textAlign: 'center' }}>
          <p style={{ fontSize: isA6 ? '9px' : '12px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>
            {config.footerText || ''}
          </p>
        </div>
      </div>
    </div>
  );
};
