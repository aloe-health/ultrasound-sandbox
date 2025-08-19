import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

function humanize(segment: string) {
  if (!segment) return "Home";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const parts = [{ name: "Home", path: "/" }];
  segments.reduce((accPath, segment) => {
    const next = `${accPath}/${segment}`;
    parts.push({ name: humanize(segment), path: next });
    return next;
  }, "");

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {parts.map((part, idx) => (
          <React.Fragment key={part.path}>
            <BreadcrumbItem>
              {idx === parts.length - 1 ? (
                <BreadcrumbPage>{part.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={part.path}>{part.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {idx < parts.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}


