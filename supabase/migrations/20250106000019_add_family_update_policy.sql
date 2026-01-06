-- Add UPDATE policy for families table
-- Family members can update their family settings

CREATE POLICY "Family members can update family" ON families
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_id = families.id
    AND fm.user_id = auth.uid()
  )
);
