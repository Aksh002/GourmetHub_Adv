import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderWithItems } from "@shared/schema";
import PaymentGateway from "./payment-gateway";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems;
}

export default function PaymentModal({ isOpen, onClose, order }: PaymentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
        </DialogHeader>
        <PaymentGateway order={order} onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  );
}