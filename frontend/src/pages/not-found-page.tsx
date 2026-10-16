import { Compass } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <EmptyState
        icon={Compass}
        title="No encontramos esta página"
        description="Puede que el enlace esté roto o que la página ya no exista."
        action={
          <Button asChild>
            <Link to="/">Volver al dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
