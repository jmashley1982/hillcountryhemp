import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import logoUrl from "@assets/magnific_a-logo-for-an-app-called-_BmilZlpoQR_1780360768055.png";

export function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem("thc-age-gate");
    if (!verified) {
      setShow(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem("thc-age-gate", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-card w-full max-w-md p-8 text-center border-4 border-primary rounded-xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 text-primary/10">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 17L5.5 21L8 13.5L2 9H9.5L12 2Z"/></svg>
        </div>
        
        <img
          src={logoUrl}
          alt="Texas Hill Country Hemp Finder"
          className="h-20 w-auto mx-auto mb-6 relative z-10"
        />
        <h2 className="text-4xl text-primary mb-2 relative z-10">Hold Up, Partner.</h2>
        <p className="font-bold text-xl mb-6 relative z-10 text-foreground">Are you 21 or older?</p>
        
        <p className="text-muted-foreground mb-8 text-sm relative z-10">
          You must be at least 21 years of age to view this content and purchase hemp products in the state of Texas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <Button size="lg" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg border-b-4 border-black/20" onClick={handleConfirm}>
            Yes, I am 21+
          </Button>
          <Button size="lg" variant="outline" className="flex-1 border-2 font-bold text-lg" onClick={() => window.location.href = "https://google.com"}>
            No, I'm Not
          </Button>
        </div>
      </div>
    </div>
  );
}
