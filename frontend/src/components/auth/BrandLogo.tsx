export default function BrandLogo() {
  return (
    <div className="flex justify-center">
      <div
        role="img"
        aria-label="JettMessage"
        className="h-11 w-11 shrink-0 bg-gradient-to-br from-[#FF6B35] via-[#FF4D6D] to-[#E91E8C] sm:h-12 sm:w-12"
        style={{
          WebkitMaskImage: 'url(/chat.png)',
          maskImage: 'url(/chat.png)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    </div>
  )
}
