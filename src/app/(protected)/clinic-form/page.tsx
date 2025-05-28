import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import ClinicForm from "./components/form";

const ClinicFormPage = () => {
  return (
    <div>
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar clinica</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <ClinicForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default ClinicFormPage;
