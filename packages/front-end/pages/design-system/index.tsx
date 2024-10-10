import { Button, Flex } from "@radix-ui/themes";
import { useState } from "react";
import HelperText from "@/components/Radix/HelperText";
import Checkbox from "@/components/Radix/Checkbox";
import {
  Dropdown,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownSubMenu,
} from "@/components/Radix/Dropdown";

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="pagecontents container-fluid">
      <h1>GrowthBook Design System</h1>
      <p>
        This page is a work in progress to document the GrowthBook design
        system.
      </p>

      <h2>Components</h2>
      <div className="appbox p-3">
        <h3>HelperText</h3>
        <Flex direction="column" gap="3">
          <HelperText status="info">This is an info message</HelperText>
          <HelperText status="warning">This is a warning message</HelperText>
          <HelperText status="error">This is an error message</HelperText>
          <HelperText status="success">This is a success message</HelperText>
        </Flex>
      </div>
      <div className="appbox p-3">
        <h3>Checkbox</h3>
        <Flex direction="column" gap="3">
          <Checkbox
            label="Checkbox Label"
            value={checked}
            setValue={(v) => {
              setChecked(v);
            }}
          />
          <Checkbox
            label="Checkbox With Description"
            value={checked}
            setValue={(v) => {
              setChecked(v);
            }}
            description="This is a description"
          />
          <Checkbox
            label="Checkbox With Warning (and description)"
            value={checked}
            setValue={(v) => {
              setChecked(v);
            }}
            description="This is a description"
            error="This is a warning message"
            errorLevel="warning"
          />
          <Checkbox
            label="Checkbox With Error"
            value={checked}
            setValue={(v) => {
              setChecked(v);
            }}
            error="This is an error message"
          />
          <Checkbox
            label="Disabled"
            value={checked}
            setValue={(v) => {
              setChecked(v);
            }}
            disabled
          />
        </Flex>
      </div>
      <div className="appbox p-3">
        <h3>Dropdown</h3>
        <Dropdown trigger={<Button variant="outline">Dropdown Trigger</Button>}>
          <DropdownMenuLabel>Menu Label</DropdownMenuLabel>
          <DropdownSubMenu trigger="Item 1">
            <DropdownMenuItem>Item 1.1</DropdownMenuItem>
          </DropdownSubMenu>
          <DropdownMenuItem
            onClick={function (): void {
              alert("Item 2");
            }}
          >
            Item 2
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item 3</DropdownMenuItem>
          <DropdownMenuItem> Item 4</DropdownMenuItem>
          <DropdownMenuItem color="red">Item 5</DropdownMenuItem>
        </Dropdown>
      </div>
    </div>
  );
}
DesignSystemPage.preAuth = true;
DesignSystemPage.preAuthTopNav = true;
