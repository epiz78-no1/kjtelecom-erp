import { useState } from "react";
import { MaterialFormDialog } from "../MaterialFormDialog";
import { Button } from "@/components/ui/button";

export default function MaterialFormDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>자재 추가 다이얼로그 열기</Button>
      <MaterialFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={(data) => console.log("등록:", data)}
      />
    </div>
  );
}
