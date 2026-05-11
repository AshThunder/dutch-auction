export function Footer() {
  return (
    <footer className="bg-inverse-surface dark:bg-surface-dim text-on-primary-fixed dark:text-on-primary-fixed font-body-md text-body-md full-width py-12 flat no shadows mt-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="col-span-1 lg:col-span-2">
          <div className="font-display-xl text-headline-lg text-surface-bright mb-4 font-bold tracking-tight">DUTCH AUCTION</div>
          <p className="text-surface-variant opacity-80 mt-2 max-w-xs">
            © 2024 Zama FHE Dutch Auction. All data is end-to-end encrypted.
          </p>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <h4 className="font-label-mono text-label-mono text-surface-variant uppercase tracking-widest mb-2">Resources</h4>
          <a className="text-surface-variant opacity-80 hover:text-tertiary-fixed transition-colors cursor-pointer w-fit" href="#">Whitepaper</a>
          <a className="text-surface-variant opacity-80 hover:text-tertiary-fixed transition-colors cursor-pointer w-fit" href="https://docs.zama.ai/fhevm">FHE Docs</a>
          <a className="text-surface-variant opacity-80 hover:text-tertiary-fixed transition-colors cursor-pointer w-fit" href="https://github.com/zama-ai/fhevm">Github</a>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <h4 className="font-label-mono text-label-mono text-surface-variant uppercase tracking-widest mb-2">Legal</h4>
          <a className="text-surface-variant opacity-80 hover:text-tertiary-fixed transition-colors cursor-pointer w-fit" href="#">Terms</a>
          <a className="text-surface-variant opacity-80 hover:text-tertiary-fixed transition-colors cursor-pointer w-fit" href="#">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
