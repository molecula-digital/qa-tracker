export function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-8 px-6">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} Retrack. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="/privacy" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Privacy
          </a>
          <a href="/terms" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Terms
          </a>
          <a href="/contact" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
