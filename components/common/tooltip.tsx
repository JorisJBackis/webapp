import {TooltipProps} from "recharts";

type ValueType = number;
type NameType = string;

export function CustomTooltipContent({
                                       active,
                                       payload,
                                       label,
                                       formatter,
                                     }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  return (
      <div className="bg-background p-3 border rounded shadow-xs">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((entry, i) => {
          // apply formatter if provided
          const formatted = formatter
              ? formatter(entry.value, entry.name, entry, i, payload)
              : [entry.value, entry.name];

          const [value, name] = Array.isArray(formatted)
              ? formatted
              : [formatted, entry.name];

          const showName =
              typeof name === "string" && name.trim().length > 0;

          return (
              <p key={i} className="text-muted-foreground">
                {showName ? `${name}: ` : ""}
                {value}
              </p>
          );
        })}
      </div>
  );
}

export const cursorHover = {fill: "var(--color-muted)", opacity: 0.5};
