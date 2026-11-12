import React, { useRef } from 'react';

interface TitleDeedProps {
  land: any;
  onClose: () => void;
}

export const TitleDeed: React.FC<TitleDeedProps> = ({ land, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  // Native browser print function
  const handlePrint = () => {
    const printContent = componentRef.current;
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `Title_Deed_${land.parcelId}`;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the title deed');
      return;
    }

    const styles = document.querySelectorAll('link[rel="stylesheet"], style');
    let stylesHTML = '';
    styles.forEach((style) => {
      if (style.tagName === 'LINK') {
        stylesHTML += `<link rel="stylesheet" href="${(style as HTMLLinkElement).href}">`;
      } else {
        stylesHTML += `<style>${(style as HTMLStyleElement).innerHTML}</style>`;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Title Deed - ${land.parcelId}</title>
          ${stylesHTML}
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Generate QR Code for blockchain verification (using Google Charts API)
  const getQRCodeUrl = () => {
    const verificationUrl = `http://localhost:5000/verify/${land.parcelId}`;
    return `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(verificationUrl)}&choe=UTF-8`;
  };

  // Generate unique title deed number
  const titleDeedNumber = `TD/${new Date().getFullYear()}/${land.parcelId.split('/')[0] || 'LR'}/${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Title Deed Content */}
        <div ref={componentRef} className="p-8 bg-white">
          {/* Kenyan Coat of Arms / Header */}
          <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
            <div className="flex justify-center mb-2">
              <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="#8B4513" strokeWidth="2" fill="#F5F5DC"/>
                <circle cx="50" cy="50" r="35" stroke="#8B4513" strokeWidth="1.5" fill="none"/>
                <path d="M50 20 L55 40 L75 45 L55 50 L50 70 L45 50 L25 45 L45 40 Z" fill="#8B4513" stroke="#8B4513" strokeWidth="1"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">REPUBLIC OF KENYA</h1>
            <h2 className="text-xl font-bold text-gray-800">MINISTRY OF LANDS AND PHYSICAL PLANNING</h2>
            <h3 className="text-lg font-semibold text-gray-700 mt-2">TITLE DEED</h3>
            <p className="text-sm text-gray-500">Issued under the Land Registration Act No. 3 of 2012</p>
          </div>

          {/* Title Number */}
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-500">TITLE NUMBER</p>
            <p className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 inline-block px-4">
              {titleDeedNumber}
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Land Reference */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">LAND REFERENCE:</p>
                <p className="text-gray-900">{land.parcelId}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">REGISTRATION DATE:</p>
                <p className="text-gray-900">{new Date(land.createdAt).toLocaleDateString('en-KE')}</p>
              </div>
            </div>

            {/* Owner Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">PROPRIETOR (OWNER):</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name:</p>
                  <p className="font-medium text-gray-900">{land.owner?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ID/Passport No.:</p>
                  <p className="font-medium text-gray-900">{land.owner?.idNumber || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email:</p>
                  <p className="font-medium text-gray-900">{land.owner?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Wallet Address:</p>
                  <p className="font-mono text-xs text-gray-600">{land.owner?.walletAddress || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Property Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">PROPERTY DESCRIPTION:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Location:</p>
                  <p className="text-gray-900">{land.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Area:</p>
                  <p className="text-gray-900">{land.area} Acres / {(land.area * 4046.86).toFixed(2)} sq m</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Boundaries:</p>
                  <p className="text-sm text-gray-600">As per survey map reference {land.parcelId}/SURV/2025</p>
                </div>
              </div>
            </div>

            {/* Encumbrances */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">ENCUMBRANCES:</p>
              <p className="text-sm text-gray-600">NONE REGISTERED</p>
            </div>

            {/* Blockchain Verification */}
            <div className="border-t-2 border-gray-300 pt-4 mt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-gray-700">BLOCKCHAIN VERIFICATION:</p>
                  <p className="text-xs font-mono text-gray-500 break-all">Tx Hash: {land.blockchainHash}</p>
                  <p className="text-xs font-mono text-gray-500 break-all">Data Hash: {land.dataHash?.substring(0, 40)}...</p>
                </div>
                <div className="text-center">
                  <img 
                    src={getQRCodeUrl()} 
                    alt="Blockchain QR Code" 
                    className="w-24 h-24"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Scan to Verify</p>
                </div>
              </div>
            </div>

            {/* Registrar Signature and Seal */}
            <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-300">
              <div>
                <p className="text-sm font-semibold text-gray-700">REGISTRAR'S SIGNATURE:</p>
                <div className="mt-2">
                  <svg width="200" height="40" viewBox="0 0 200 40">
                    <path d="M10,20 C30,10 50,30 70,20 C90,10 110,30 130,20 C150,10 170,30 190,20" 
                          stroke="#000" strokeWidth="1.5" fill="none"/>
                    <text x="80" y="35" fontSize="10" fill="#333">Digitally Signed</text>
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mt-1">Chief Land Registrar</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-gray-400 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#8B4513" strokeWidth="2" fill="none"/>
                    <path d="M50 30 L60 45 L75 45 L65 55 L70 70 L50 60 L30 70 L35 55 L25 45 L40 45 Z" fill="#8B4513"/>
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1">OFFICIAL SEAL</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200">
              <p>This Title Deed is issued under the Land Registration Act, 2012 and is secured on the Ethereum Blockchain.</p>
              <p>Verification URL: http://localhost:5000/verify/{land.parcelId}</p>
              <p>Generated on: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Title Deed
          </button>
        </div>
      </div>
    </div>
  );
};