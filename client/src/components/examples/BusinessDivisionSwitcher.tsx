import { useState } from "react";
import { BusinessDivisionSwitcher } from "../BusinessDivisionSwitcher";

export default function BusinessDivisionSwitcherExample() {
  const [selected, setSelected] = useState("div1");
  
  const divisions = [
    { id: "div1", name: "사업부 1" },
    { id: "div2", name: "사업부 2" },
  ];

  return (
    <div className="p-4">
      <BusinessDivisionSwitcher
        divisions={divisions}
        selectedId={selected}
        onSelect={setSelected}
      />
    </div>
  );
}
