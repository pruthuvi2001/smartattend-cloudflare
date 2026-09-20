import { getClasses, saveClass } from "../classes/classService";
import { getStudents, updateStudent } from "../students/studentService";
import { ClassEntity } from "@/types/class";
import { Student } from "@/types/student";

let migrationRan = false;

/**
 * Automatically inspects and migrates existing students with legacy plain text 'class' strings
 * to relational linked 'classIds'.
 */
export async function autoMigrateLegacyClasses(): Promise<{
  migratedStudentsCount: number;
  createdClassesCount: number;
}> {
  if (migrationRan) {
    return { migratedStudentsCount: 0, createdClassesCount: 0 };
  }
  migrationRan = true;

  try {
    const [existingClasses, students] = await Promise.all([
      getClasses(),
      getStudents(),
    ]);

    const classMapByName = new Map<string, ClassEntity>();
    existingClasses.forEach((c) => {
      classMapByName.set(c.name.trim().toLowerCase(), c);
    });

    let migratedStudentsCount = 0;
    let createdClassesCount = 0;

    for (const student of students) {
      // Check if student is missing classIds or has empty classIds
      if (!student.classIds || student.classIds.length === 0) {
        const legacyClassName = (student.class || "Grade 10").trim();
        const lowerName = legacyClassName.toLowerCase();

        let targetClass = classMapByName.get(lowerName);

        // If matching ClassEntity does not exist yet, auto-create it
        if (!targetClass) {
          const newClassId = lowerName.replace(/\s+/g, "-");
          targetClass = await saveClass({
            id: newClassId,
            name: legacyClassName,
            schedules: [],
          });
          classMapByName.set(lowerName, targetClass);
          createdClassesCount++;
        }

        // Update student with relational classIds
        const updatedClassIds = [targetClass.id];
        const updatedDisplayNames = [targetClass.name];

        await updateStudent(student.studentId, {
          classIds: updatedClassIds,
          classDisplayNames: updatedDisplayNames,
          class: targetClass.name, // Keep legacy string in sync
        });

        migratedStudentsCount++;
      }
    }

    if (migratedStudentsCount > 0) {
      console.log(
        `✅ [CLASS MIGRATION] Migrated ${migratedStudentsCount} student(s) to relational classIds. Created ${createdClassesCount} new class entity(ies).`
      );
    }

    return { migratedStudentsCount, createdClassesCount };
  } catch (err) {
    console.error("Error running autoMigrateLegacyClasses:", err);
    return { migratedStudentsCount: 0, createdClassesCount: 0 };
  }
}
