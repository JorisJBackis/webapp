"use client";
import {useTheme} from "next-themes";
import {Button} from "@/components/ui/button";
import {Icons} from "@/components/icons/icons";

export function ModeToggleInstant() {
  const { theme, setTheme } = useTheme();
  return (
      <Button
          variant="ghost"
          onClick={() => {
            const newTheme = theme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
          }}
          className="size-8"
      >
        <Icons.halfMoon />
      </Button>
  );
}