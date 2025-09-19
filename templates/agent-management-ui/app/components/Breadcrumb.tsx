import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      <Link to="/home" className="hover:text-foreground transition-colors">
        <Home className="w-4 h-4" />
      </Link>

      {items.map((item, index) => (
        <BreadcrumbSegment
          key={index}
          item={item}
          isLast={index === items.length - 1}
        />
      ))}
    </nav>
  );
}

interface BreadcrumbSegmentProps {
  item: BreadcrumbItem;
  isLast: boolean;
}

function BreadcrumbSegment({ item, isLast }: BreadcrumbSegmentProps) {
  return (
    <>
      <ChevronRight className="w-4 h-4" />
      {item.href && !isLast ? (
        <Link to={item.href} className="hover:text-foreground transition-colors">
          {item.label}
        </Link>
      ) : (
        <span className={isLast ? "text-foreground font-medium" : ""}>
          {item.label}
        </span>
      )}
    </>
  );
}