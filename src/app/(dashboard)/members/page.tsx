import Link from "next/link";
import { getServerSession } from "next-auth";
import { Plus, UserCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface SearchParams { tab?: string; search?: string }

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) {
    return (
      <>
        <Header title="Members" />
        <div className="p-6"><p className="text-muted-foreground">Access denied.</p></div>
      </>
    );
  }

  const { tab = "students", search = "" } = await searchParams;

  const students = tab === "students"
    ? await prisma.student.findMany({
        where: search
          ? {
              OR: [
                { user: { name: { contains: search, mode: "insensitive" } } },
                { admissionNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        include: {
          user: { select: { name: true, email: true, isActive: true } },
          academicYear: { select: { year: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: [{ class: "asc" }, { section: "asc" }, { user: { name: "asc" } }],
      })
    : [];

  const staff = tab === "staff"
    ? await prisma.staff.findMany({
        where: search
          ? {
              OR: [
                { user: { name: { contains: search, mode: "insensitive" } } },
                { staffId: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        include: {
          user: { select: { name: true, email: true, role: true, isActive: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: { user: { name: "asc" } },
      })
    : [];

  return (
    <>
      <Header title="Members" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border p-1 bg-card w-fit">
            <TabLink href="/members?tab=students" active={tab === "students"}>Students</TabLink>
            <TabLink href="/members?tab=staff" active={tab === "staff"}>Staff</TabLink>
          </div>
          <Button asChild>
            <Link href={tab === "staff" ? "/members/staff/new" : "/members/students/new"}>
              <Plus className="h-4 w-4 mr-2" />
              Add {tab === "staff" ? "Staff" : "Student"}
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          {tab === "students" ? (
            <StudentTable students={students} />
          ) : (
            <StaffTable staff={staff} />
          )}
        </div>
      </div>
    </>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

type StudentWithRelations = {
  id: string;
  admissionNumber: string;
  class: string;
  section: string;
  user: { name: string; email: string; isActive: boolean };
  academicYear: { year: string };
  _count: { transactions: number };
};

function StudentTable({ students }: { students: StudentWithRelations[] }) {
  if (!students.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-medium">No students found</p>
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Admission No.</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Academic Year</TableHead>
          <TableHead className="text-center">Transactions</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.user.name}</TableCell>
            <TableCell className="font-mono text-sm">{s.admissionNumber}</TableCell>
            <TableCell>{s.class}-{s.section}</TableCell>
            <TableCell>{s.academicYear.year}</TableCell>
            <TableCell className="text-center">{s._count.transactions}</TableCell>
            <TableCell>
              <Badge variant={s.user.isActive ? "success" : "secondary"}>
                {s.user.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/members/students/${s.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type StaffWithRelations = {
  id: string;
  staffId: string;
  department: string | null;
  user: { name: string; email: string; role: string; isActive: boolean };
  _count: { transactions: number };
};

function StaffTable({ staff }: { staff: StaffWithRelations[] }) {
  if (!staff.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-medium">No staff found</p>
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Staff ID</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-center">Transactions</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.user.name}</TableCell>
            <TableCell className="font-mono text-sm">{s.staffId}</TableCell>
            <TableCell>{s.department || "—"}</TableCell>
            <TableCell>
              <Badge variant="outline">{s.user.role}</Badge>
            </TableCell>
            <TableCell className="text-center">{s._count.transactions}</TableCell>
            <TableCell>
              <Badge variant={s.user.isActive ? "success" : "secondary"}>
                {s.user.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/members/staff/${s.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
