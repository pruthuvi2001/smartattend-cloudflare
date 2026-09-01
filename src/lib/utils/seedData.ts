import { Student } from "@/types/student";

export const SAMPLE_STUDENTS: Omit<Student, 'createdAt' | 'updatedAt'>[] = [
  {
    studentId: "STU001",
    fullName: "John Silva",
    class: "Grade 10",
    section: "A",
    email: "john.silva@smartattend.edu",
    phone: "+94 77 123 4567",
    qrCodeValue: "STU001",
    status: "ACTIVE"
  },
  {
    studentId: "STU002",
    fullName: "Sarah Perera",
    class: "Grade 10",
    section: "A",
    email: "sarah.p@smartattend.edu",
    phone: "+94 71 234 5678",
    qrCodeValue: "STU002",
    status: "ACTIVE"
  },
  {
    studentId: "STU003",
    fullName: "David Fernando",
    class: "Grade 10",
    section: "B",
    email: "david.f@smartattend.edu",
    phone: "+94 76 345 6789",
    qrCodeValue: "STU003",
    status: "ACTIVE"
  },
  {
    studentId: "STU004",
    fullName: "Ananya Jayasinghe",
    class: "Grade 10",
    section: "B",
    email: "ananya.j@smartattend.edu",
    phone: "+94 78 456 7890",
    qrCodeValue: "STU004",
    status: "ACTIVE"
  },
  {
    studentId: "STU005",
    fullName: "Dilshan Wickrama",
    class: "Grade 11",
    section: "A",
    email: "dilshan.w@smartattend.edu",
    phone: "+94 70 567 8901",
    qrCodeValue: "STU005",
    status: "ACTIVE"
  },
  {
    studentId: "STU006",
    fullName: "Michelle Rodrigo",
    class: "Grade 11",
    section: "A",
    email: "michelle.r@smartattend.edu",
    phone: "+94 75 678 9012",
    qrCodeValue: "STU006",
    status: "ACTIVE"
  },
  {
    studentId: "STU007",
    fullName: "Kasun Bandara",
    class: "Grade 11",
    section: "B",
    email: "kasun.b@smartattend.edu",
    phone: "+94 72 789 0123",
    qrCodeValue: "STU007",
    status: "ACTIVE"
  },
  {
    studentId: "STU008",
    fullName: "Tharushi Mendis",
    class: "Grade 11",
    section: "B",
    email: "tharushi.m@smartattend.edu",
    phone: "+94 77 890 1234",
    qrCodeValue: "STU008",
    status: "ACTIVE"
  },
  {
    studentId: "STU009",
    fullName: "Kevin Alwis",
    class: "Grade 12",
    section: "Maths",
    email: "kevin.a@smartattend.edu",
    phone: "+94 71 901 2345",
    qrCodeValue: "STU009",
    status: "ACTIVE"
  },
  {
    studentId: "STU010",
    fullName: "Nadeesha Senanayake",
    class: "Grade 12",
    section: "Bio",
    email: "nadeesha.s@smartattend.edu",
    phone: "+94 76 012 3456",
    qrCodeValue: "STU010",
    status: "ACTIVE"
  }
];
